import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Reward from '../models/Reward.js';
import User from '../models/User.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateReward = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('pointsCost').isNumeric().withMessage('Points cost must be a number'),
];

// Get all rewards
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    
    // Filter rewards based on user role and clientId
    if (req.user.role === 'dealer') {
      query.clientId = req.user.clientId;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    const rewards = await Reward.find(query).sort({ createdAt: -1 });
    res.json(rewards);
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reward by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check if user has access to this reward
    if (req.user.role === 'dealer' && reward.clientId.toString() !== req.user.clientId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(reward);
  } catch (error) {
    console.error('Get reward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new reward
router.post('/', authMiddleware, authorize(['super_admin', 'client']), validateReward, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, pointsCost, image, quantity, expiryDate } = req.body;

    const newReward = new Reward({
      title,
      description,
      pointsCost,
      image: image || '/images/default-reward.png',
      clientId: req.user.role === 'super_admin' ? req.body.clientId : req.user.id,
      quantity: quantity || -1,
      expiryDate: expiryDate || null
    });

    await newReward.save();
    res.status(201).json(newReward);
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update reward
router.put('/:id', authMiddleware, authorize(['super_admin', 'client']), validateReward, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, pointsCost, image, isActive, quantity, expiryDate } = req.body;

    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check if user has permission to update this reward
    if (req.user.role === 'client' && reward.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    reward.title = title;
    reward.description = description;
    reward.pointsCost = pointsCost;
    if (image) reward.image = image;
    if (isActive !== undefined) reward.isActive = isActive;
    if (quantity !== undefined) reward.quantity = quantity;
    if (expiryDate !== undefined) reward.expiryDate = expiryDate;

    await reward.save();
    res.json(reward);
  } catch (error) {
    console.error('Update reward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete reward
router.delete('/:id', authMiddleware, authorize(['super_admin', 'client']), async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check if user has permission to delete this reward
    if (req.user.role === 'client' && reward.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Reward.findByIdAndDelete(req.params.id);
    res.json({ message: 'Reward deleted successfully' });
  } catch (error) {
    console.error('Delete reward error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Redeem reward
router.post('/:id/redeem', authMiddleware, authorize(['dealer']), async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find reward with session
    const reward = await Reward.findById(req.params.id).session(session);
    if (!reward) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check if reward is active
    if (!reward.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'This reward is no longer active' });
    }

    // Check if reward has expired
    if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'This reward has expired' });
    }

    // Check if reward is out of stock
    if (reward.quantity === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'This reward is out of stock' });
    }

    // Get user with session
    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has enough points
    if (user.points < reward.pointsCost) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Not enough points to redeem this reward' });
    }

    // Deduct points from user
    user.points -= reward.pointsCost;
    
    // Add to points history
    user.pointsHistory.push({
      amount: -reward.pointsCost,
      type: 'spent',
      source: 'reward',
      sourceId: reward._id,
      description: `Redeemed reward: ${reward.title}`
    });

    // Update user stats
    if (!user.stats) {
      user.stats = {};
    }
    user.stats.rewardsRedeemed = (user.stats.rewardsRedeemed || 0) + 1;
    user.stats.lastActive = new Date();

    // Add redemption to reward
    const redemptionId = new mongoose.Types.ObjectId();
    reward.redemptions.push({
      _id: redemptionId,
      userId: user._id,
      status: 'pending',
      redeemedAt: new Date()
    });

    // Decrease quantity if it's not unlimited
    if (reward.quantity > 0) {
      reward.quantity -= 1;
    }

    // Save changes within the transaction
    await user.save({ session });

    // Get pending rewards count from the Reward model's redemptions
    let pendingRewards = 0;
    try {
      // Import Reward model if not already imported
      const Reward = mongoose.models.Reward || (await import('../models/Reward.js')).default;
      
      // Query for pending reward redemptions
      const pendingRedemptionsQuery = {
        'redemptions.userId': req.user.role === 'dealer' ? req.user.id : null,
        'redemptions.status': 'pending'
      };
      
      // For clients, we need to count all their dealers' pending redemptions
      if (req.user.role === 'client') {
        delete pendingRedemptionsQuery['redemptions.userId'];
        pendingRedemptionsQuery.clientId = req.user.id;
      }
      
      // Use aggregation to count pending redemptions
      const pendingRedemptionsResult = await Reward.aggregate([
        // Aggregation pipeline...
      ]);
      
      pendingRewards = pendingRedemptionsResult.length > 0 ? pendingRedemptionsResult[0].total : 0;
    } catch (rewardsError) {
      console.error('Error fetching pending rewards:', rewardsError);
      // Continue execution even if rewards count fails
    }

    await reward.save({ session });
    
    // Create notifications for the redemption
    try {
      // Import Notification model if not already imported
      const Notification = mongoose.models.Notification || (await import('../models/Notification.js')).default;
      
      // Notification for the dealer who redeemed the reward
      const userNotification = new Notification({
        recipient: user._id,
        sender: null,
        type: 'reward',
        title: 'Reward Redeemed',
        message: `You have successfully redeemed ${reward.title} for ${reward.pointsCost} points.`,
        relatedId: reward._id,
        relatedModel: 'Reward',
        channels: ['app']
      });
      
      await userNotification.save({ session });
      
      // Notification for the client about the redemption
      const clientNotification = new Notification({
        recipient: reward.clientId,
        sender: user._id,
        type: 'reward',
        title: 'Reward Redemption Request',
        message: `${user.name} has requested to redeem the reward "${reward.title}".`,
        relatedId: reward._id,
        relatedModel: 'Reward',
        channels: ['app']
      });
      
      await clientNotification.save({ session });
      
      // If client has WhatsApp notifications enabled, queue a WhatsApp message
      const client = await User.findById(reward.clientId).select('notificationPreferences phone').session(session);
      if (client && client.notificationPreferences?.whatsapp && client.phone) {
        // This would be handled by a queue in production
        // For now, we'll just log it
        console.log(`WhatsApp notification queued for client ${client._id} about reward redemption request from ${user.name}`);
      }
    } catch (notificationError) {
      console.error('Error creating reward redemption notifications:', notificationError);
      // Continue with transaction even if notification creation fails
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Reward redeemed successfully',
      pointsRemaining: user.points,
      redemptionId: redemptionId
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Redeem reward error:', error);
    res.status(500).json({ 
      message: 'Failed to redeem reward', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Update redemption status (for clients to approve/reject/mark as delivered)
router.put('/:id/redemption/:redemptionId', authMiddleware, authorize(['super_admin', 'client']), async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected', 'delivered'].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid status' });
    }

    const reward = await Reward.findById(req.params.id).session(session);
    if (!reward) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check if user has permission
    if (req.user.role === 'client' && reward.clientId.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the redemption
    const redemption = reward.redemptions.id(req.params.redemptionId);
    if (!redemption) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Redemption not found' });
    }

    // Store previous status for notification purposes
    const previousStatus = redemption.status;

    // Update redemption status
    redemption.status = status;
    if (notes) redemption.notes = notes;
    redemption.updatedAt = new Date();
    redemption.updatedBy = req.user.id;

    // Save the updated reward
    await reward.save({ session });

    // If status changed to approved or rejected, we may want to notify the user
    if (previousStatus !== status && (status === 'approved' || status === 'rejected' || status === 'delivered')) {
      // Find the user who redeemed the reward
      const user = await User.findById(redemption.userId).session(session);
      if (user) {
        // Create notification for the user about redemption status change
        try {
          // Import Notification model if not already imported
          const Notification = mongoose.models.Notification || (await import('../models/Notification.js')).default;
          
          const notification = new Notification({
            recipient: user._id,
            sender: req.user.id,
            type: 'reward',
            title: `Reward ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your redemption for ${reward.title} has been ${status}.`,
            relatedId: reward._id,
            relatedModel: 'Reward',
            channels: ['app']
          });
          
          await notification.save({ session });
          
          // If user has WhatsApp notifications enabled, send a WhatsApp notification
          if (user.notificationPreferences?.whatsapp && user.phone) {
            // In production, this would be handled by a queue or direct API call
            // For now, we'll just log it
            console.log(`WhatsApp notification queued for user ${user._id} about reward redemption status change to ${status}`);
            
            // The actual implementation would look something like this:
            // const whatsappMessage = {
            //   recipient: user._id,
            //   templateName: 'reward_status_update',
            //   templateParams: [user.name, reward.title, status],
            //   notificationId: notification._id
            // };
            // Queue the WhatsApp message for sending
          }
        } catch (notificationError) {
          console.error('Error creating reward status notification:', notificationError);
          // Continue with transaction even if notification creation fails
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: 'Redemption status updated successfully', 
      redemption 
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update redemption status error:', error);
    res.status(500).json({ 
      message: 'Failed to update redemption status', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

export default router;
