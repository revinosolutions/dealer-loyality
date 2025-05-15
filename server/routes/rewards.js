import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware, restrictAdminCreatedClients, restrictClientCreatedDealers } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Reward = mongoose.model('Reward');
const Redemption = mongoose.model('Redemption');
const User = mongoose.model('User');

// Get all rewards with filtering
router.get('/', [authMiddleware, restrictClientCreatedDealers], async (req, res) => {
  try {
    const { 
      type, minPoints, maxPoints, 
      available, sort, limit = 20, page = 1 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      // Dealers can see all rewards available to them based on client
      query['requirements.userRoles'] = 'dealer';
      
      if (req.user.clientId) {
        query.$or = [
          { 'requirements.clientSpecific': false },
          { 
            'requirements.clientSpecific': true, 
            'requirements.clientId': req.user.clientId 
          }
        ];
      } else {
        query['requirements.clientSpecific'] = false;
      }
    } else if (req.user.role === 'client') {
      // Clients can see rewards for their dealers or themselves
      query.$or = [
        { 'requirements.userRoles': 'client' },
        { 
          'requirements.userRoles': 'dealer',
          $or: [
            { 'requirements.clientSpecific': false },
            { 
              'requirements.clientSpecific': true, 
              'requirements.clientId': req.user.id 
            }
          ]
        }
      ];
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by points range
    if (minPoints !== undefined || maxPoints !== undefined) {
      query.pointsCost = {};
      if (minPoints !== undefined) query.pointsCost.$gte = Number(minPoints);
      if (maxPoints !== undefined) query.pointsCost.$lte = Number(maxPoints);
    }
    
    // Filter by availability
    if (available === 'true') {
      const now = new Date();
      query['availability.available'] = true;
      query.$or = query.$or || [];
      query.$or.push(
        { 'availability.startDate': { $exists: false } },
        { 'availability.startDate': { $lte: now } }
      );
      query.$or.push(
        { 'availability.endDate': { $exists: false } },
        { 'availability.endDate': { $gte: now } }
      );
      query.$or.push(
        { 'availability.stock': { $exists: false } },
        { 'availability.stock': { $gt: 0 } }
      );
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { pointsCost: 1 }; // Default: lowest points first
    if (sort === 'points-desc') sortOption = { pointsCost: -1 };
    if (sort === 'name-asc') sortOption = { name: 1 };
    if (sort === 'name-desc') sortOption = { name: -1 };
    if (sort === 'popular') sortOption = { redemptionCount: -1 };
    
    // Execute query
    const rewards = await Reward.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');
    
    // Get total count for pagination
    const total = await Reward.countDocuments(query);
    
    res.json({
      rewards,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get rewards error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reward by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const rewardId = req.params.id;
    
    const reward = await Reward.findById(rewardId)
      .populate('createdBy', 'name email')
      .populate('requirements.clientId', 'name email');
    
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    // Check eligibility for this user
    let isEligible = true;
    const eligibilityReason = [];
    
    // Check user role
    if (reward.requirements.userRoles && 
        reward.requirements.userRoles.length > 0 &&
        !reward.requirements.userRoles.includes(req.user.role)) {
      isEligible = false;
      eligibilityReason.push('This reward is not available for your user role');
    }
    
    // Check client-specific requirements
    if (isEligible && reward.requirements.clientSpecific) {
      if (req.user.role === 'dealer') {
        if (!req.user.clientId || 
            req.user.clientId.toString() !== reward.requirements.clientId.toString()) {
          isEligible = false;
          eligibilityReason.push('This reward is only available to dealers of a specific client');
        }
      } else if (req.user.role === 'client' && 
                req.user.id !== reward.requirements.clientId.toString()) {
        isEligible = false;
        eligibilityReason.push('This reward is only available to a specific client');
      }
    }
    
    // Check points requirement
    if (isEligible && reward.requirements.minPoints > req.user.points) {
      isEligible = false;
      eligibilityReason.push(`You need at least ${reward.requirements.minPoints} points (you have ${req.user.points})`);
    }
    
    // Check if reward is available
    if (isEligible && !reward.isAvailable()) {
      isEligible = false;
      
      if (!reward.availability.available) {
        eligibilityReason.push('This reward is currently unavailable');
      } else if (reward.availability.startDate && reward.availability.startDate > new Date()) {
        eligibilityReason.push(`This reward will be available from ${reward.availability.startDate.toLocaleDateString()}`);
      } else if (reward.availability.endDate && reward.availability.endDate < new Date()) {
        eligibilityReason.push(`This reward expired on ${reward.availability.endDate.toLocaleDateString()}`);
      } else if (reward.availability.stock !== undefined && reward.availability.stock <= 0) {
        eligibilityReason.push('This reward is out of stock');
      }
    }
    
    // Check max redemptions per user if specified
    if (isEligible && 
        reward.availability.maxRedemptionsPerUser !== undefined &&
        reward.availability.maxRedemptionsPerUser > 0) {
      
      const userRedemptionCount = await Redemption.countDocuments({
        userId: req.user.id,
        rewardId: reward._id,
        status: { $in: ['approved', 'pending', 'delivered'] }
      });
      
      if (userRedemptionCount >= reward.availability.maxRedemptionsPerUser) {
        isEligible = false;
        eligibilityReason.push(`You can only redeem this reward ${reward.availability.maxRedemptionsPerUser} time(s)`);
      }
    }
    
    // Add eligibility info to response
    const response = {
      ...reward.toObject(),
      isEligible,
      eligibilityReason: isEligible ? [] : eligibilityReason
    };
    
    res.json(response);
  } catch (err) {
    console.error('Get reward error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new reward (admin/superadmin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('pointsCost', 'Points cost must be a positive number').isInt({ min: 0 }),
  check('type', 'Type is required').isIn(['product', 'discount', 'cashback', 'experience', 'other'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { 
      name, description, pointsCost, type, value,
      image, availability, requirements, 
      redemptionInstructions, termsAndConditions
    } = req.body;
    
    // Create new reward
    const newReward = new Reward({
      name,
      description,
      pointsCost: Number(pointsCost),
      type,
      value: Number(value),
      image,
      availability: availability || {
        available: true
      },
      requirements: requirements || {
        minPoints: 0,
        userRoles: ['dealer']
      },
      redemptionInstructions,
      termsAndConditions,
      createdBy: req.user.id
    });
    
    await newReward.save();
    
    res.status(201).json(newReward);
  } catch (err) {
    console.error('Create reward error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update reward (admin/superadmin only)
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  check('name', 'Name is required if updating').optional().not().isEmpty(),
  check('description', 'Description is required if updating').optional().not().isEmpty(),
  check('pointsCost', 'Points cost must be a positive number').optional().isInt({ min: 0 }),
  check('type', 'Invalid type').optional().isIn(['product', 'discount', 'cashback', 'experience', 'other'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const rewardId = req.params.id;
    
    // Find reward
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    // Update fields if provided
    const { 
      name, description, pointsCost, type, value,
      image, availability, requirements, 
      redemptionInstructions, termsAndConditions
    } = req.body;
    
    if (name) reward.name = name;
    if (description) reward.description = description;
    if (pointsCost !== undefined) reward.pointsCost = Number(pointsCost);
    if (type) reward.type = type;
    if (value !== undefined) reward.value = Number(value);
    if (image) reward.image = image;
    
    if (availability) {
      reward.availability = { ...reward.availability, ...availability };
    }
    
    if (requirements) {
      reward.requirements = { ...reward.requirements, ...requirements };
    }
    
    if (redemptionInstructions) reward.redemptionInstructions = redemptionInstructions;
    if (termsAndConditions) reward.termsAndConditions = termsAndConditions;
    
    reward.updatedAt = Date.now();
    await reward.save();
    
    res.json(reward);
  } catch (err) {
    console.error('Update reward error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Redeem a reward
router.post('/:id/redeem', [
  authMiddleware,
  check('deliveryDetails', 'Delivery details are required for physical rewards').optional()
], async (req, res) => {
  try {
    const rewardId = req.params.id;
    const { deliveryDetails, notes } = req.body;
    
    // Find reward
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check eligibility and availability
    if (!reward.isAvailable()) {
      return res.status(400).json({ message: 'This reward is not currently available' });
    }
    
    // Check user role eligibility
    if (reward.requirements.userRoles && 
        reward.requirements.userRoles.length > 0 &&
        !reward.requirements.userRoles.includes(user.role)) {
      return res.status(403).json({ message: 'This reward is not available for your user role' });
    }
    
    // Check client-specific requirements
    if (reward.requirements.clientSpecific) {
      if (user.role === 'dealer') {
        if (!user.clientId || 
            user.clientId.toString() !== reward.requirements.clientId.toString()) {
          return res.status(403).json({ message: 'This reward is not available to you' });
        }
      } else if (user.role === 'client' && 
                user.id !== reward.requirements.clientId.toString()) {
        return res.status(403).json({ message: 'This reward is not available to you' });
      }
    }
    
    // Check points requirement
    if (reward.requirements.minPoints > user.points) {
      return res.status(400).json({ 
        message: `Insufficient points. You need ${reward.requirements.minPoints} points (you have ${user.points})` 
      });
    }
    
    // Check if user has enough points
    if (user.points < reward.pointsCost) {
      return res.status(400).json({ 
        message: `Insufficient points. Reward costs ${reward.pointsCost} points (you have ${user.points})` 
      });
    }
    
    // Check max redemptions per user if specified
    if (reward.availability.maxRedemptionsPerUser !== undefined &&
        reward.availability.maxRedemptionsPerUser > 0) {
      
      const userRedemptionCount = await Redemption.countDocuments({
        userId: user._id,
        rewardId: reward._id,
        status: { $in: ['approved', 'pending', 'delivered'] }
      });
      
      if (userRedemptionCount >= reward.availability.maxRedemptionsPerUser) {
        return res.status(400).json({ 
          message: `You have already redeemed this reward the maximum number of times (${reward.availability.maxRedemptionsPerUser})` 
        });
      }
    }
    
    // Create redemption
    const redemption = new Redemption({
      userId: user._id,
      rewardId: reward._id,
      pointsCost: reward.pointsCost,
      status: 'pending',
      deliveryDetails,
      notes
    });
    
    // Update user's points
    user.points -= reward.pointsCost;
    
    // Add to points history
    user.pointsHistory.push({
      amount: -reward.pointsCost,
      type: 'redeemed',
      source: 'reward',
      sourceId: reward._id,
      description: `Reward redemption: ${reward.name}`,
      date: new Date()
    });
    
    // Update user's stats
    user.stats.rewardsRedeemed += 1;
    
    // Update reward's redemption count
    reward.redemptionCount += 1;
    
    // Update reward's stock if applicable
    if (reward.availability.stock !== undefined) {
      reward.availability.stock -= 1;
      
      // If stock is now 0, set availability to false
      if (reward.availability.stock <= 0) {
        reward.availability.stock = 0;
        // Leave available flag as is, admin might want to restock
      }
    }
    
    // Save all updates
    await Promise.all([
      redemption.save(),
      user.save(),
      reward.save()
    ]);
    
    // Return redemption with populated fields
    const populatedRedemption = await Redemption.findById(redemption._id)
      .populate('rewardId', 'name image type value')
      .populate('userId', 'name email');
    
    res.status(201).json(populatedRedemption);
  } catch (err) {
    console.error('Redeem reward error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's redemption history
router.get('/user/redemptions', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    // Filter by status if specified
    if (status) {
      query.status = status;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const redemptions = await Redemption.find(query)
      .sort({ redemptionDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('rewardId', 'name image type value')
      .populate('userId', 'name email');
    
    // Get total count for pagination
    const total = await Redemption.countDocuments(query);
    
    res.json({
      redemptions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get redemption history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all redemptions (admin/superadmin only)
router.get('/admin/redemptions', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { status, userId, rewardId, limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by status if specified
    if (status) {
      query.status = status;
    }
    
    // Filter by user if specified
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by reward if specified
    if (rewardId) {
      query.rewardId = rewardId;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const redemptions = await Redemption.find(query)
      .sort({ redemptionDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('rewardId', 'name image type value')
      .populate('userId', 'name email role');
    
    // Get total count for pagination
    const total = await Redemption.countDocuments(query);
    
    res.json({
      redemptions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get all redemptions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update redemption status (admin/superadmin only)
router.put('/redemptions/:id/status', [
  authMiddleware,
  adminMiddleware,
  check('status', 'Status is required').isIn(['pending', 'approved', 'cancelled', 'delivered', 'expired'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const redemptionId = req.params.id;
    const { status, notes } = req.body;
    
    // Find redemption
    const redemption = await Redemption.findById(redemptionId)
      .populate('userId', 'points pointsHistory')
      .populate('rewardId', 'name pointsCost availability');
    
    if (!redemption) {
      return res.status(404).json({ message: 'Redemption not found' });
    }
    
    const previousStatus = redemption.status;
    
    // Update status
    redemption.status = status;
    if (notes) redemption.notes = notes;
    
    // Handle cancellation - return points to user
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const user = await User.findById(redemption.userId._id);
      
      if (user) {
        // Return points
        user.points += redemption.pointsCost;
        
        // Add to points history
        user.pointsHistory.push({
          amount: redemption.pointsCost,
          type: 'adjusted',
          source: 'reward',
          sourceId: redemption.rewardId._id,
          description: `Cancelled reward redemption: ${redemption.rewardId.name}`,
          date: new Date()
        });
        
        // Decrement stats
        user.stats.rewardsRedeemed -= 1;
        
        await user.save();
      }
      
      // Return item to stock if applicable
      const reward = await Reward.findById(redemption.rewardId._id);
      if (reward && reward.availability.stock !== undefined) {
        reward.availability.stock += 1;
        reward.redemptionCount -= 1;
        await reward.save();
      }
    }
    
    // If delivery details were provided for a physical reward
    if (status === 'delivered' && req.body.deliveryDetails) {
      redemption.deliveryDetails = {
        ...redemption.deliveryDetails,
        ...req.body.deliveryDetails,
        deliveryDate: new Date()
      };
    }
    
    redemption.updatedAt = Date.now();
    await redemption.save();
    
    // Return updated redemption with populated fields
    const updatedRedemption = await Redemption.findById(redemptionId)
      .populate('rewardId', 'name image type value')
      .populate('userId', 'name email');
    
    res.json(updatedRedemption);
  } catch (err) {
    console.error('Update redemption status error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Redemption not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 