import express from 'express';
import { body, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { deliverNotification } from '../services/notificationDeliveryService.js';

const router = express.Router();

// Validation middleware
const validateNotification = [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['contest', 'reward', 'achievement', 'sales', 'system']).withMessage('Valid notification type is required'),
  body('recipient').notEmpty().withMessage('Recipient is required'),
];

// Get all notifications for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    // Build query
    let query = { recipient: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    
    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'name avatar');

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalNotifications: total
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unread notification count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user is the recipient
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create notification (admin/client only)
router.post('/', authMiddleware, authorize(['super_admin', 'client']), validateNotification, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, type, recipient, channels = ['app'], relatedId, relatedModel } = req.body;
    
    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Check if client is sending to their own dealer
    if (req.user.role === 'client' && recipientUser.role === 'dealer' && 
        recipientUser.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create notification
    const notification = new Notification({
      title,
      message,
      type,
      recipient,
      sender: req.user.id,
      channels,
      relatedId,
      relatedModel,
      deliveryStatus: {
        app: 'pending',
        whatsapp: channels.includes('whatsapp') ? 'pending' : 'not_applicable',
        email: channels.includes('email') ? 'pending' : 'not_applicable'
      }
    });

    await notification.save();
    
    // Trigger actual delivery to WhatsApp/email if needed
    
    // Deliver notification through configured channels
    if (channels.includes('email') || channels.includes('whatsapp')) {
      const deliveryResult = await deliverNotification(notification._id);
      
      if (!deliveryResult.success) {
        console.error('Notification delivery error:', deliveryResult.error);
        // We still return success since the notification was created
      }
    }
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user is the recipient or has admin rights
    if (notification.recipient.toString() !== req.user.id && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await notification.deleteOne();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined notification routes
router.use((req, res) => {
  res.status(404).json({ message: 'Notification endpoint not found' });
});

export default router;
