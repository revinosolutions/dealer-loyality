import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'contest', 
      'reward', 
      'achievement', 
      'sales', 
      'system', 
      'order',
      'purchase_request_approved',
      'purchase_request_rejected'
    ],
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  channels: [{
    type: String,
    enum: ['app', 'email', 'whatsapp'],
    default: 'app'
  }],
  deliveryStatus: {
    app: {
      type: String,
      enum: ['pending', 'sent', 'read', 'failed', 'not_sent'],
      default: 'pending'
    },
    email: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'not_sent'],
      default: 'not_sent'
    },
    whatsapp: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'not_sent'],
      default: 'not_sent'
    }
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Contest', 'Reward', 'Order', 'Sales', 'Achievement', 'PurchaseRequest']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for faster queries
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ relatedId: 1, relatedModel: 1 });
notificationSchema.index({ 'deliveryStatus.app': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to send notification to a user
notificationSchema.statics.sendToUser = async function(data) {
  const { recipient, sender, type, title, message, channels, relatedId, relatedModel, metadata, priority, expiresAt } = data;
  
  // Create the notification
  const notification = new this({
    recipient,
    sender,
    type,
    title,
    message,
    channels: channels || ['app'],
    relatedId,
    relatedModel,
    metadata,
    priority,
    expiresAt
  });
  
  // Initialize delivery status based on channels
  notification.deliveryStatus = {
    app: channels?.includes('app') ? 'pending' : 'not_sent',
    email: channels?.includes('email') ? 'pending' : 'not_sent',
    whatsapp: channels?.includes('whatsapp') ? 'pending' : 'not_sent'
  };
  
  await notification.save();
  
  // Return created notification
  return notification;
};

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadForUser = function(userId) {
  return this.find({ recipient: userId, read: false })
    .sort({ createdAt: -1 })
    .populate('sender', 'name avatar')
    .exec();
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  const notification = await this.findOne({ _id: notificationId, recipient: userId });
  
  if (!notification) {
    throw new Error('Notification not found or access denied');
  }
  
  notification.read = true;
  notification.deliveryStatus.app = 'read';
  await notification.save();
  
  return notification;
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    { recipient: userId, read: false },
    { 
      $set: { 
        read: true,
        'deliveryStatus.app': 'read',
        updatedAt: new Date()
      } 
    }
  );
  
  return result.modifiedCount;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;