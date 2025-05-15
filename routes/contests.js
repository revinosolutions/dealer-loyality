import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Contest from '../models/Contest.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation middleware
const validateContestInput = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('goal').notEmpty().withMessage('Goal is required'),
  body('goalType')
    .isIn(['sales_amount', 'sales_count', 'new_customers', 'product_specific', 'custom'])
    .withMessage('Invalid goal type'),
  body('targetValue').isNumeric().withMessage('Target value must be a number'),
  body('reward').notEmpty().withMessage('Reward is required'),
];

// Get all contests
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query based on user role and filter parameters
    const query = {};
    
    // If status filter is provided
    if (status && ['active', 'upcoming', 'completed'].includes(status)) {
      query.status = status;
    }
    
    // If user is client, only show their contests
    if (req.user.role === 'client') {
      query.clientId = req.user._id;
    }
    
    // If user is dealer, show contests from their client
    if (req.user.role === 'dealer' && req.user.clientId) {
      query.clientId = req.user.clientId;
    }
    
    // Count total contests matching query
    const totalContests = await Contest.countDocuments(query);
    
    // Find contests
    const contests = await Contest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(+limit)
      .populate('clientId', 'name email');
    
    // Calculate pagination data
    const totalPages = Math.ceil(totalContests / limit);
    
    res.json({
      contests,
      pagination: {
        total: totalContests,
        page: +page,
        limit: +limit,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single contest by ID
router.get('/:id', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('approvedBy', 'name email')
      .populate('participants.userId', 'name email avatar');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // If user is not admin or the client who created the contest
    if (
      req.user.role !== 'admin' && 
      (req.user.role === 'client' && contest.clientId.toString() !== req.user._id.toString()) &&
      (req.user.role === 'dealer' && contest.clientId.toString() !== req.user.clientId?.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized to access this contest' });
    }
    
    res.json({ contest });
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new contest
router.post('/', [authorize(['admin', 'client']), validateContestInput], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      title,
      description,
      startDate,
      endDate,
      goal,
      goalType,
      targetValue,
      reward,
      rules,
      rewardDetails
    } = req.body;
    
    // Check if dates are valid
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Set status based on dates
    let status = 'upcoming';
    const now = new Date();
    
    if (new Date(startDate) <= now && new Date(endDate) >= now) {
      status = 'active';
    } else if (new Date(endDate) < now) {
      status = 'completed';
    }
    
    // Create new contest
    const contest = new Contest({
      title,
      description,
      startDate,
      endDate,
      goal,
      goalType,
      targetValue,
      reward,
      status,
      clientId: req.user.role === 'client' ? req.user._id : req.body.clientId,
      rules: rules || {},
      rewardDetails: rewardDetails || {}
    });
    
    // If user is admin, auto-approve contest
    if (req.user.role === 'admin') {
      contest.approvalStatus = 'approved';
      contest.approvedBy = req.user._id;
      contest.approvalDate = new Date();
    }
    
    await contest.save();
    
    res.status(201).json({
      contest,
      message: 'Contest created successfully'
    });
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contest
router.put('/:id', [authorize(['admin', 'client']), validateContestInput], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is authorized to update this contest
    if (req.user.role === 'client' && contest.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this contest' });
    }
    
    // Update fields
    const {
      title,
      description,
      startDate,
      endDate,
      goal,
      goalType,
      targetValue,
      reward,
      rules,
      rewardDetails
    } = req.body;
    
    // Check if dates are valid
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Set status based on dates
    let status = 'upcoming';
    const now = new Date();
    
    if (new Date(startDate) <= now && new Date(endDate) >= now) {
      status = 'active';
    } else if (new Date(endDate) < now) {
      status = 'completed';
    }
    
    // Update contest fields
    contest.title = title;
    contest.description = description;
    contest.startDate = startDate;
    contest.endDate = endDate;
    contest.goal = goal;
    contest.goalType = goalType;
    contest.targetValue = targetValue;
    contest.reward = reward;
    contest.status = status;
    
    if (rules) contest.rules = rules;
    if (rewardDetails) contest.rewardDetails = rewardDetails;
    
    // If client updates an approved contest, reset approval status
    if (
      req.user.role === 'client' && 
      contest.approvalStatus === 'approved' &&
      !['title', 'description'].every(field => req.body[field] === contest[field])
    ) {
      contest.approvalStatus = 'pending';
      contest.approvedBy = undefined;
      contest.approvalDate = undefined;
    }
    
    // If admin is updating, auto-approve
    if (req.user.role === 'admin') {
      contest.approvalStatus = 'approved';
      contest.approvedBy = req.user._id;
      contest.approvalDate = new Date();
    }
    
    await contest.save();
    
    res.json({
      contest,
      message: 'Contest updated successfully'
    });
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete contest
router.delete('/:id', authorize(['admin', 'client']), async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is authorized to delete this contest
    if (req.user.role === 'client' && contest.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this contest' });
    }
    
    await Contest.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join contest (for dealers)
router.post('/:id/join', authorize(['dealer']), async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest is active or upcoming
    if (contest.status === 'completed') {
      return res.status(400).json({ message: 'Cannot join a completed contest' });
    }
    
    // Check if already joined
    const alreadyJoined = contest.participants.some(
      participant => participant.userId.toString() === req.user._id.toString()
    );
    
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You are already participating in this contest' });
    }
    
    // Add user to participants
    contest.participants.push({
      userId: req.user._id,
      joinedAt: new Date(),
      progress: 0,
      currentValue: 0
    });
    
    await contest.save();
    
    res.json({
      message: 'Successfully joined the contest',
      contest
    });
  } catch (error) {
    console.error('Error joining contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve contest (admin only)
router.post('/:id/approve', authorize(['admin']), async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Update approval status
    contest.approvalStatus = 'approved';
    contest.approvedBy = req.user._id;
    contest.approvalDate = new Date();
    contest.approvalNotes = req.body.notes;
    
    await contest.save();
    
    res.json({
      message: 'Contest approved successfully',
      contest
    });
  } catch (error) {
    console.error('Error approving contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject contest (admin only)
router.post('/:id/reject', authorize(['admin']), async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Update approval status
    contest.approvalStatus = 'rejected';
    contest.approvedBy = req.user._id;
    contest.approvalDate = new Date();
    contest.approvalNotes = req.body.notes || 'Contest rejected';
    
    await contest.save();
    
    res.json({
      message: 'Contest rejected successfully',
      contest
    });
  } catch (error) {
    console.error('Error rejecting contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Handle undefined contest routes
router.use((req, res) => {
  res.status(404).json({ message: 'Contest endpoint not found' });
});

export default router;
