import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const { Achievement, UserAchievement } = mongoose.model('Achievement');
const User = mongoose.model('User');

// Get all achievements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      type, category, isActive, 
      sort, limit = 20, page = 1 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { displayOrder: 1, createdAt: -1 }; // Default sort
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'name-asc') sortOption = { name: 1 };
    if (sort === 'name-desc') sortOption = { name: -1 };
    
    // Execute query
    const achievements = await Achievement.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name');
    
    // Get user's achievements if authenticated
    let userAchievements = [];
    if (req.user) {
      userAchievements = await UserAchievement.find({ 
        userId: req.user.id
      }).populate('achievementId');
    }
    
    // Get total count for pagination
    const total = await Achievement.countDocuments(query);
    
    // Map user progress to achievements
    const achievementsWithProgress = achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => 
        ua.achievementId && ua.achievementId._id.toString() === achievement._id.toString()
      );
      
      return {
        ...achievement.toObject(),
        userProgress: userAchievement ? {
          progress: userAchievement.progress,
          isCompleted: userAchievement.isCompleted,
          earnedDate: userAchievement.earnedDate
        } : null
      };
    });
    
    res.json({
      achievements: achievementsWithProgress,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get achievement by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const achievementId = req.params.id;
    
    const achievement = await Achievement.findById(achievementId)
      .populate('createdBy', 'name email');
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    // Get user's progress for this achievement
    let userProgress = null;
    if (req.user) {
      const userAchievement = await UserAchievement.findOne({
        userId: req.user.id,
        achievementId: achievement._id
      });
      
      if (userAchievement) {
        userProgress = {
          progress: userAchievement.progress,
          isCompleted: userAchievement.isCompleted,
          earnedDate: userAchievement.earnedDate
        };
      }
    }
    
    // Add user progress to response
    const response = {
      ...achievement.toObject(),
      userProgress
    };
    
    res.json(response);
  } catch (err) {
    console.error('Get achievement error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new achievement (admin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('type', 'Type is required').isIn(['sales', 'activity', 'engagement', 'milestone', 'other']),
  check('criteria.value', 'Criteria value is required').isNumeric()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name, description, icon, badgeUrl, type,
      criteria, reward, category, displayOrder, isActive
    } = req.body;
    
    // Create new achievement
    const newAchievement = new Achievement({
      name,
      description,
      icon,
      badgeUrl,
      type,
      criteria,
      reward: reward || {
        points: 0,
        bonusMultiplier: 1
      },
      category: category || 'beginner',
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });
    
    await newAchievement.save();
    
    res.status(201).json(newAchievement);
  } catch (err) {
    console.error('Create achievement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update achievement (admin only)
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  check('name', 'Name is required if updating').optional().not().isEmpty(),
  check('description', 'Description is required if updating').optional().not().isEmpty(),
  check('type', 'Invalid type').optional().isIn(['sales', 'activity', 'engagement', 'milestone', 'other']),
  check('criteria.value', 'Criteria value must be numeric').optional().isNumeric()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const achievementId = req.params.id;
    
    // Find achievement
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    // Update fields if provided
    const {
      name, description, icon, badgeUrl, type,
      criteria, reward, category, displayOrder, isActive
    } = req.body;
    
    if (name) achievement.name = name;
    if (description) achievement.description = description;
    if (icon) achievement.icon = icon;
    if (badgeUrl) achievement.badgeUrl = badgeUrl;
    if (type) achievement.type = type;
    
    if (criteria) {
      achievement.criteria = { ...achievement.criteria, ...criteria };
    }
    
    if (reward) {
      achievement.reward = { ...achievement.reward, ...reward };
    }
    
    if (category) achievement.category = category;
    if (displayOrder !== undefined) achievement.displayOrder = displayOrder;
    if (isActive !== undefined) achievement.isActive = isActive;
    
    achievement.updatedAt = Date.now();
    await achievement.save();
    
    res.json(achievement);
  } catch (err) {
    console.error('Update achievement error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Track user achievement progress (automatic or admin only)
router.post('/progress', [
  authMiddleware,
  check('userId', 'User ID is required').not().isEmpty(),
  check('achievementId', 'Achievement ID is required').not().isEmpty(),
  check('progress', 'Progress value is required').isNumeric()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId, achievementId, progress, metadata } = req.body;
    
    // Only admins or system can update others' progress
    if (userId !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find user and achievement
    const [user, achievement] = await Promise.all([
      User.findById(userId),
      Achievement.findById(achievementId)
    ]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }
    
    // Get or create user achievement
    let userAchievement = await UserAchievement.findOne({
      userId,
      achievementId
    });
    
    if (!userAchievement) {
      userAchievement = new UserAchievement({
        userId,
        achievementId,
        progress: 0,
        isCompleted: false
      });
    }
    
    // Update progress
    userAchievement.progress = Math.min(Math.max(0, progress), 100);
    
    // Check if achievement is completed
    const isNewlyCompleted = !userAchievement.isCompleted && userAchievement.progress >= 100;
    
    if (isNewlyCompleted) {
      userAchievement.isCompleted = true;
      userAchievement.earnedDate = new Date();
      
      // Award points if this is a new completion
      if (achievement.reward && achievement.reward.points > 0) {
        user.points += achievement.reward.points;
        
        // Add to points history
        user.pointsHistory.push({
          amount: achievement.reward.points,
          type: 'earned',
          source: 'achievement',
          sourceId: achievement._id,
          description: `Achievement: ${achievement.name}`,
          date: new Date()
        });
        
        await user.save();
      }
    }
    
    // Save metadata if provided
    if (metadata) {
      userAchievement.metadata = metadata;
    }
    
    await userAchievement.save();
    
    // Return updated user achievement
    const populatedUserAchievement = await UserAchievement.findById(userAchievement._id)
      .populate('achievementId')
      .populate('userId', 'name email role');
    
    res.json({
      userAchievement: populatedUserAchievement,
      newlyCompleted: isNewlyCompleted,
      pointsAwarded: isNewlyCompleted ? (achievement.reward?.points || 0) : 0
    });
  } catch (err) {
    console.error('Track achievement progress error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User or achievement not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's achievements
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Only allow users to see their own achievements or admins to see any
    if (userId !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's achievements
    const userAchievements = await UserAchievement.find({ userId })
      .populate('achievementId')
      .sort({ earnedDate: -1 });
    
    // Group by category and completion status
    const completed = userAchievements.filter(ua => ua.isCompleted);
    const inProgress = userAchievements.filter(ua => !ua.isCompleted);
    
    // Get categories with completion counts
    const categories = await Achievement.aggregate([
      { $group: { _id: '$category', total: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const categoryStats = categories.map(cat => {
      const completedInCategory = completed.filter(
        ua => ua.achievementId && ua.achievementId.category === cat._id
      ).length;
      
      return {
        category: cat._id,
        total: cat.total,
        completed: completedInCategory,
        percentage: Math.round((completedInCategory / cat.total) * 100)
      };
    });
    
    res.json({
      completed,
      inProgress,
      categoryStats,
      totalCompleted: completed.length,
      totalInProgress: inProgress.length
    });
  } catch (err) {
    console.error('Get user achievements error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 