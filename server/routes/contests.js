import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Contest = mongoose.model('Contest');
const User = mongoose.model('User');

// Get all contests (with role-based filtering)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, type, createdBy, search } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by status if specified
    if (status) {
      query.status = status;
    }
    
    // Filter by type if specified
    if (type) {
      query.type = type;
    }
    
    // Filter by creator if specified
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      // Dealers can only see contests they're eligible for
      query.$or = [
        { participants: req.user.id }, // They're already participating
        { 
          status: 'active',
          'eligibility.roles': 'dealer',
          // If contest is client-specific, only show if they belong to that client
          $or: [
            { 'eligibility.clientSpecific': false },
            { 'eligibility.clientId': req.user.clientId }
          ]
        }
      ];
    } else if (req.user.role === 'client') {
      // Clients can see contests they created or are open to all clients
      query.$or = [
        { createdBy: req.user.id }, // They created it
        { 
          status: 'active',
          'eligibility.roles': 'client'
        }
      ];
    }
    
    // Find contests with populated creator
    const contests = await Contest.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    
    res.json(contests);
  } catch (err) {
    console.error('Get contests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contest by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contestId = req.params.id;
    
    // Find contest with populated fields
    const contest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user has permission to view this contest
    if (req.user.role === 'dealer') {
      // Dealers can only view contests they're eligible for
      const isParticipant = contest.participants.some(p => p._id.toString() === req.user.id);
      const isEligible = contest.eligibility.roles.includes('dealer') && 
        (!contest.eligibility.clientSpecific || contest.eligibility.clientId.toString() === req.user.clientId?.toString());
      
      if (!isParticipant && !isEligible) {
        return res.status(403).json({ message: 'You do not have permission to view this contest' });
      }
    }
    
    res.json(contest);
  } catch (err) {
    console.error('Get contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new contest (client/admin/superadmin only)
router.post('/', [
  authMiddleware,
  clientMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('type', 'Type is required').isIn(['sales', 'achievement', 'activity', 'custom']),
  check('startDate', 'Start date is required').isISO8601(),
  check('endDate', 'End date is required').isISO8601(),
  check('goal', 'Goal must be a number').isNumeric(),
  check('reward.type', 'Reward type is required').isIn(['points', 'prize', 'badge']),
  check('reward.value', 'Reward value is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, description, type, startDate, endDate, goal,
    reward, eligibility, participants, rules, status 
  } = req.body;

  try {
    // Create new contest
    const newContest = new Contest({
      name,
      description,
      type,
      startDate,
      endDate,
      goal,
      reward,
      eligibility: eligibility || {
        roles: ['dealer'],
        clientSpecific: req.user.role === 'client', // If created by client, limit to their dealers
        clientId: req.user.role === 'client' ? req.user.id : undefined
      },
      participants: participants || [],
      rules: rules || {},
      status: status || 'draft',
      createdBy: req.user.id
    });

    await newContest.save();

    // Return the new contest with populated creator
    const savedContest = await Contest.findById(newContest._id)
      .populate('createdBy', 'name email role');
    
    res.json(savedContest);
  } catch (err) {
    console.error('Create contest error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contest (creator or admin/superadmin only)
router.put('/:id', [
  authMiddleware,
  check('name', 'Name is required if updating').optional().not().isEmpty(),
  check('description', 'Description is required if updating').optional().not().isEmpty(),
  check('type', 'Invalid type').optional().isIn(['sales', 'achievement', 'activity', 'custom']),
  check('status', 'Invalid status').optional().isIn(['draft', 'active', 'completed', 'cancelled'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const contestId = req.params.id;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user has permission to update this contest
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && 
        contest.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this contest' });
    }
    
    // Update fields if provided
    const { 
      name, description, type, startDate, endDate, goal,
      reward, eligibility, participants, rules, status 
    } = req.body;
    
    if (name) contest.name = name;
    if (description) contest.description = description;
    if (type) contest.type = type;
    if (startDate) contest.startDate = startDate;
    if (endDate) contest.endDate = endDate;
    if (goal) contest.goal = goal;
    if (reward) contest.reward = { ...contest.reward, ...reward };
    if (eligibility) contest.eligibility = { ...contest.eligibility, ...eligibility };
    if (participants) contest.participants = participants;
    if (rules) contest.rules = { ...contest.rules, ...rules };
    if (status) contest.status = status;
    
    contest.updatedAt = Date.now();
    await contest.save();
    
    // Return updated contest with populated fields
    const updatedContest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points');
    
    res.json(updatedContest);
  } catch (err) {
    console.error('Update contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a contest (dealers only)
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    // Only dealers can join contests
    if (req.user.role !== 'dealer') {
      return res.status(403).json({ message: 'Only dealers can join contests' });
    }
    
    const contestId = req.params.id;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest is active
    if (contest.status !== 'active') {
      return res.status(400).json({ message: `Contest is ${contest.status}, not accepting new participants` });
    }
    
    // Check if user is eligible
    if (!contest.eligibility.roles.includes('dealer')) {
      return res.status(403).json({ message: 'You are not eligible for this contest' });
    }
    
    // If client-specific, check if dealer belongs to that client
    if (contest.eligibility.clientSpecific && 
        contest.eligibility.clientId.toString() !== req.user.clientId?.toString()) {
      return res.status(403).json({ message: 'You are not eligible for this contest' });
    }
    
    // Check if user is already a participant
    if (contest.participants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already participating in this contest' });
    }
    
    // Add user to participants
    contest.participants.push(req.user.id);
    await contest.save();
    
    // Update user's stats
    const user = await User.findById(req.user.id);
    user.stats.contestsParticipated += 1;
    await user.save();
    
    // Return updated contest with populated fields
    const updatedContest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points');
    
    res.json(updatedContest);
  } catch (err) {
    console.error('Join contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a contest (dealers only)
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    // Only dealers can leave contests
    if (req.user.role !== 'dealer') {
      return res.status(403).json({ message: 'Only dealers can leave contests' });
    }
    
    const contestId = req.params.id;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest is active
    if (contest.status !== 'active') {
      return res.status(400).json({ message: `Contest is ${contest.status}, cannot leave at this time` });
    }
    
    // Check if user is a participant
    if (!contest.participants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are not participating in this contest' });
    }
    
    // Remove user from participants
    contest.participants = contest.participants.filter(
      id => id.toString() !== req.user.id
    );
    await contest.save();
    
    // Return updated contest with populated fields
    const updatedContest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points');
    
    res.json(updatedContest);
  } catch (err) {
    console.error('Leave contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete a contest (creator or admin/superadmin only)
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const contestId = req.params.id;
    const { winners } = req.body;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && 
        contest.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to complete this contest' });
    }
    
    // Check if contest is active
    if (contest.status !== 'active') {
      return res.status(400).json({ message: `Contest is ${contest.status}, cannot be completed` });
    }
    
    // Update contest status and winners
    contest.status = 'completed';
    contest.winners = winners || [];
    contest.completedAt = new Date();
    await contest.save();
    
    // Award points to winners if applicable
    if (contest.reward.type === 'points' && winners && winners.length > 0) {
      for (const winnerId of winners) {
        const user = await User.findById(winnerId);
        if (user) {
          // Update points
          user.points += Number(contest.reward.value);
          
          // Add to points history
          user.pointsHistory.push({
            amount: Number(contest.reward.value),
            type: 'earned',
            source: 'contest',
            sourceId: contest._id,
            description: `Contest reward: ${contest.name}`,
            date: new Date()
          });
          
          // Update stats
          user.stats.contestsWon += 1;
          
          await user.save();
        }
      }
    }
    
    // Return updated contest with populated fields
    const updatedContest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points')
      .populate('winners', 'name email role points');
    
    res.json(updatedContest);
  } catch (err) {
    console.error('Complete contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel a contest (creator or admin/superadmin only)
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const contestId = req.params.id;
    const { reason } = req.body;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && 
        contest.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to cancel this contest' });
    }
    
    // Check if contest can be cancelled (not already completed)
    if (contest.status === 'completed') {
      return res.status(400).json({ message: 'Contest is already completed and cannot be cancelled' });
    }
    
    // Update contest status
    contest.status = 'cancelled';
    contest.cancellationReason = reason || 'No reason provided';
    contest.updatedAt = new Date();
    await contest.save();
    
    // Return updated contest with populated fields
    const updatedContest = await Contest.findById(contestId)
      .populate('createdBy', 'name email role')
      .populate('participants', 'name email role points');
    
    res.json(updatedContest);
  } catch (err) {
    console.error('Cancel contest error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 