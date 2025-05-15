import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Notification = mongoose.model('Notification');

// Get user's notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      read, type, limit = 20, page = 1, sort = 'newest' 
    } = req.query;
    
    // Build query
    const query = {
      recipient: req.user.id
    };
    
    // Filter by read status
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'priority-high') sortOption = { priority: -1, createdAt: -1 };
    
    // Execute query
    const notifications = await Notification.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('sender', 'name avatar role')
      .populate('relatedId');
    
    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // Find notification and ensure it belongs to this user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Update as read
    notification.read = true;
    notification.deliveryStatus.app = 'read';
    notification.updatedAt = Date.now();
    
    await notification.save();
    
    res.json(notification);
  } catch (err) {
    console.error('Mark notification as read error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/all/read', authMiddleware, async (req, res) => {
  try {
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { 
        $set: { 
          read: true, 
          'deliveryStatus.app': 'read',
          updatedAt: Date.now()
        } 
      }
    );
    
    res.json({ 
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (err) {
    console.error('Mark all notifications as read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // Find notification and ensure it belongs to this user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    await notification.deleteOne();
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Send notification (admin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('recipients', 'Recipients are required').isArray({ min: 1 }),
  check('title', 'Title is required').not().isEmpty(),
  check('message', 'Message is required').not().isEmpty(),
  check('type', 'Type is required').isIn([
    'contest', 'reward', 'achievement', 'sales', 'system', 'order'
  ])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      recipients, title, message, type,
      channels, relatedId, relatedModel,
      metadata, priority, expiresAt
    } = req.body;
    
    // Create notifications for each recipient
    const notifications = [];
    
    for (const recipientId of recipients) {
      const notification = new Notification({
        recipient: recipientId,
        sender: req.user.id,
        title,
        message,
        type,
        channels: channels || ['app'],
        relatedId,
        relatedModel,
        metadata,
        priority: priority || 'medium',
        expiresAt: expiresAt || undefined
      });
      
      // Initialize delivery status based on channels
      notification.deliveryStatus = {
        app: channels && channels.includes('app') ? 'pending' : 'not_sent',
        email: channels && channels.includes('email') ? 'pending' : 'not_sent',
        whatsapp: channels && channels.includes('whatsapp') ? 'pending' : 'not_sent'
      };
      
      notifications.push(notification);
    }
    
    const savedNotifications = await Notification.insertMany(notifications);
    
    // TODO: Trigger background jobs for email and WhatsApp delivery
    
    res.status(201).json({
      message: `${savedNotifications.length} notifications created`,
      notifications: savedNotifications
    });
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send notification to all users of a certain role (admin only)
router.post('/group', [
  authMiddleware,
  adminMiddleware,
  check('roles', 'At least one role is required').isArray({ min: 1 }),
  check('title', 'Title is required').not().isEmpty(),
  check('message', 'Message is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      roles, title, message, type = 'system',
      channels = ['app'], relatedId, relatedModel,
      metadata, priority, expiresAt
    } = req.body;
    
    // Find all users with the specified roles
    const User = mongoose.model('User');
    const users = await User.find({ 
      role: { $in: roles },
      status: 'active'
    }).select('_id');
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found with the specified roles' });
    }
    
    // Create batch of notifications
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      title,
      message,
      type,
      channels,
      relatedId,
      relatedModel,
      metadata,
      priority: priority || 'medium',
      expiresAt: expiresAt || undefined,
      deliveryStatus: {
        app: channels.includes('app') ? 'pending' : 'not_sent',
        email: channels.includes('email') ? 'pending' : 'not_sent',
        whatsapp: channels.includes('whatsapp') ? 'pending' : 'not_sent'
      }
    }));
    
    // Use bulk insert for better performance
    await Notification.insertMany(notifications);
    
    // TODO: Trigger background jobs for email and WhatsApp delivery
    
    res.status(201).json({
      message: `${notifications.length} notifications created and will be sent to users with roles: ${roles.join(', ')}`
    });
  } catch (err) {
    console.error('Send group notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification statistics (admin only)
router.get('/stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    // Get notification count by type
    const typeStats = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get notification count by read status
    const readStats = await Notification.aggregate([
      { $group: { _id: '$read', count: { $sum: 1 } } }
    ]);
    
    // Get notification count by channel
    const channelStats = await Notification.aggregate([
      { $unwind: '$channels' },
      { $group: { _id: '$channels', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get notification count by delivery status
    const deliveryStats = {
      app: await Notification.aggregate([
        { $group: { _id: '$deliveryStatus.app', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      email: await Notification.aggregate([
        { $group: { _id: '$deliveryStatus.email', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      whatsapp: await Notification.aggregate([
        { $group: { _id: '$deliveryStatus.whatsapp', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };
    
    // Get notification count by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await Notification.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Format daily stats for charts
    const formattedDailyStats = dailyStats.map(day => ({
      date: new Date(day._id.year, day._id.month - 1, day._id.day),
      count: day.count
    }));
    
    // Total notification count
    const totalCount = await Notification.countDocuments();
    
    res.json({
      totalCount,
      typeStats,
      readStats: {
        read: readStats.find(stat => stat._id === true)?.count || 0,
        unread: readStats.find(stat => stat._id === false)?.count || 0
      },
      channelStats,
      deliveryStats,
      dailyStats: formattedDailyStats
    });
  } catch (err) {
    console.error('Get notification stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 