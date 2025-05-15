import express from 'express';
import { body, validationResult } from 'express-validator';
import Achievement from '../models/Achievement.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateAchievement = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('type').isIn(['sales_milestone', 'contest_winner', 'loyalty_duration', 'referral', 'special'])
    .withMessage('Valid achievement type is required'),
  body('criteria').notEmpty().withMessage('Achievement criteria is required'),
  body('pointsAwarded').isNumeric().withMessage('Points awarded must be a number')
];

// Get all achievements
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    
    // Filter achievements based on user role
    if (req.user.role === 'dealer') {
      // Dealers see global achievements and client-specific ones
      query.$or = [
        { isGlobal: true },
        { clientId: req.user.clientId }
      ];
    } else if (req.user.role === 'client') {
      // Clients see global achievements and their own
      query.$or = [
        { isGlobal: true },
        { clientId: req.user.id }
      ];
    }

    const achievements = await Achievement.find(query).sort({ createdAt: -1 });
    
    // For each achievement, check if the current user has earned it
    const achievementsWithStatus = achievements.map(achievement => {
      const userAchievement = achievement.userAchievements.find(
        ua => ua.userId.toString() === req.user.id
      );
      
      return {
        ...achievement.toObject(),
        userStatus: userAchievement ? {
          isCompleted: userAchievement.isCompleted,
          progress: userAchievement.progress,
          awardedAt: userAchievement.awardedAt
        } : {
          isCompleted: false,
          progress: 0,
          awardedAt: null
        }
      };
    });

    res.json(achievementsWithStatus);
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get achievement by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if user has access to this achievement
    if (!achievement.isGlobal) {
      if (req.user.role === 'dealer' && achievement.clientId.toString() !== req.user.clientId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      } else if (req.user.role === 'client' && achievement.clientId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get user's achievement status
    const userAchievement = achievement.userAchievements.find(
      ua => ua.userId.toString() === req.user.id
    );
    
    const achievementWithStatus = {
      ...achievement.toObject(),
      userStatus: userAchievement ? {
        isCompleted: userAchievement.isCompleted,
        progress: userAchievement.progress,
        awardedAt: userAchievement.awardedAt
      } : {
        isCompleted: false,
        progress: 0,
        awardedAt: null
      }
    };

    res.json(achievementWithStatus);
  } catch (error) {
    console.error('Get achievement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new achievement (admin/client only)
router.post('/', authMiddleware, authorize(['super_admin', 'client']), validateAchievement, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, type, criteria, pointsAwarded, icon, badgeImage, isGlobal } = req.body;

    const achievement = new Achievement({
      title,
      description,
      type,
      criteria,
      pointsAwarded,
      icon: icon || 'trophy',
      badgeImage: badgeImage || '/images/badges/default.png',
      isGlobal: req.user.role === 'super_admin' ? (isGlobal || false) : false,
      clientId: req.user.role === 'client' ? req.user.id : req.body.clientId
    });

    await achievement.save();
    res.status(201).json(achievement);
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update achievement
router.put('/:id', authMiddleware, authorize(['super_admin', 'client']), validateAchievement, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if user has permission to update this achievement
    if (req.user.role === 'client' && 
        (!achievement.isGlobal && achievement.clientId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    const { title, description, type, criteria, pointsAwarded, icon, badgeImage } = req.body;
    
    achievement.title = title;
    achievement.description = description;
    achievement.type = type;
    achievement.criteria = criteria;
    achievement.pointsAwarded = pointsAwarded;
    if (icon) achievement.icon = icon;
    if (badgeImage) achievement.badgeImage = badgeImage;

    // Only super_admin can change global status
    if (req.user.role === 'super_admin' && req.body.isGlobal !== undefined) {
      achievement.isGlobal = req.body.isGlobal;
      if (!achievement.isGlobal && req.body.clientId) {
        achievement.clientId = req.body.clientId;
      }
    }

    await achievement.save();
    res.json(achievement);
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete achievement
router.delete('/:id', authMiddleware, authorize(['super_admin', 'client']), async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if user has permission to delete this achievement
    if (req.user.role === 'client' && 
        (!achievement.isGlobal && achievement.clientId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await achievement.deleteOne();
    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Award achievement to user (admin/client only)
router.post('/:id/award/:userId', authMiddleware, authorize(['super_admin', 'client']), async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if user has permission to award this achievement
    if (req.user.role === 'client' && 
        (!achievement.isGlobal && achievement.clientId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if target user exists
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if client is awarding to their own dealer
    if (req.user.role === 'client' && user.role === 'dealer' && 
        user.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user already has this achievement
    const existingAchievement = achievement.userAchievements.find(
      ua => ua.userId.toString() === req.params.userId && ua.isCompleted
    );

    if (existingAchievement) {
      return res.status(400).json({ message: 'User already has this achievement' });
    }

    // Add achievement to user
    achievement.userAchievements.push({
      userId: req.params.userId,
      progress: 100,
      isCompleted: true
    });

    await achievement.save();

    // Add points to user
    if (achievement.pointsAwarded > 0) {
      user.points += achievement.pointsAwarded;
      
      // Add to points history
      user.pointsHistory.push({
        amount: achievement.pointsAwarded,
        type: 'earned',
        source: 'achievement',
        sourceId: achievement._id,
        description: `Earned achievement: ${achievement.title}`
      });

      // Update user stats
      if (!user.stats) user.stats = {};
      if (!user.stats.achievementsEarned) user.stats.achievementsEarned = 0;
      user.stats.achievementsEarned += 1;
      user.stats.lastActive = new Date();

      // Add achievement to user's achievements array
      if (!user.achievements) user.achievements = [];
      user.achievements.push({
        achievementId: achievement._id,
        awardedAt: new Date()
      });

      await user.save();
    }

    // Create notification for user
    const notification = new Notification({
      recipient: req.params.userId,
      sender: req.user.id,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `You've earned the "${achievement.title}" achievement and ${achievement.pointsAwarded} points!`,
      relatedId: achievement._id,
      relatedModel: 'Achievement',
      channels: ['app']
    });

    await notification.save();

    res.json({ 
      message: 'Achievement awarded successfully',
      achievement,
      pointsAwarded: achievement.pointsAwarded
    });
  } catch (error) {
    console.error('Award achievement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Track achievement progress (system use)
router.post('/:id/progress/:userId', authMiddleware, authorize(['super_admin', 'client', 'system']), async (req, res) => {
  try {
    const { progress } = req.body;
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Valid progress value (0-100) is required' });
    }

    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check permissions
    if (req.user.role === 'client' && 
        (!achievement.isGlobal && achievement.clientId.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find user achievement or create new entry
    let userAchievement = achievement.userAchievements.find(
      ua => ua.userId.toString() === req.params.userId
    );

    if (userAchievement) {
      userAchievement.progress = progress;
      if (progress >= 100 && !userAchievement.isCompleted) {
        userAchievement.isCompleted = true;
        userAchievement.awardedAt = new Date();
      }
    } else {
      achievement.userAchievements.push({
        userId: req.params.userId,
        progress,
        isCompleted: progress >= 100
      });

      userAchievement = achievement.userAchievements[achievement.userAchievements.length - 1];
    }

    await achievement.save();

    // If achievement is completed, award points and create notification
    if (progress >= 100 && userAchievement.isCompleted) {
      // Get user
      const user = await User.findById(req.params.userId);
      if (user) {
        // Add points
        user.points += achievement.pointsAwarded;
        
        // Add to points history
        user.pointsHistory.push({
          amount: achievement.pointsAwarded,
          type: 'earned',
          source: 'achievement',
          sourceId: achievement._id,
          description: `Earned achievement: ${achievement.title}`
        });

        // Update user stats
        if (!user.stats) user.stats = {};
        if (!user.stats.achievementsEarned) user.stats.achievementsEarned = 0;
        user.stats.achievementsEarned += 1;
        user.stats.lastActive = new Date();

        // Add achievement to user's achievements array
        if (!user.achievements) user.achievements = [];
        user.achievements.push({
          achievementId: achievement._id,
          awardedAt: new Date()
        });

        await user.save();

        // Create notification
        const notification = new Notification({
          recipient: req.params.userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: `You've earned the "${achievement.title}" achievement and ${achievement.pointsAwarded} points!`,
          relatedId: achievement._id,
          relatedModel: 'Achievement',
          channels: ['app']
        });

        await notification.save();
      }
    }

    res.json({ 
      message: 'Achievement progress updated',
      progress,
      isCompleted: userAchievement.isCompleted
    });
  } catch (error) {
    console.error('Update achievement progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined achievement routes
router.use((req, res) => {
  res.status(404).json({ message: 'Achievement endpoint not found' });
});

export default router;
