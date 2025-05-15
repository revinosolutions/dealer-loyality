/**
 * Notification Service
 * This file provides functionality for handling notifications
 * Current implementation is a mock for development purposes
 */
import { sendWhatsAppMessage } from './whatsappService.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Send a notification through various channels
 * @param {Object} options - The notification options
 * @param {string} options.recipientId - The recipient's user ID
 * @param {string} options.senderId - The sender's user ID
 * @param {string} options.type - The notification type
 * @param {string} options.title - The notification title
 * @param {string} options.message - The notification message
 * @param {Array<string>} options.channels - The channels to send through (app, email, whatsapp)
 * @param {Object} options.whatsappOptions - WhatsApp specific options
 * @returns {Promise<Object>} - The created notification
 */
export const sendNotification = async (options) => {
  try {
    const {
      recipientId,
      senderId,
      type,
      title,
      message,
      channels = ['app'],
      whatsappOptions = {}
    } = options;

    console.log(`[Notification Service] Sending notification to user ${recipientId}`);
    console.log(`[Notification Service] Title: ${title}`);
    console.log(`[Notification Service] Message: ${message}`);
    console.log(`[Notification Service] Channels: ${channels.join(', ')}`);

    // Verify recipient exists and get their preferences
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Create notification record
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      channels,
      deliveryStatus: {
        app: channels.includes('app') ? 'pending' : 'not_applicable',
        whatsapp: channels.includes('whatsapp') ? 'pending' : 'not_applicable',
        email: channels.includes('email') ? 'pending' : 'not_applicable'
      }
    });

    // Save notification to get an ID
    await notification.save();

    // Process each channel
    const deliveryPromises = [];

    // App notification is handled by the database save
    if (channels.includes('app')) {
      notification.deliveryStatus.app = 'sent';
    }

    // Send WhatsApp message if enabled for this notification and user has it enabled
    if (channels.includes('whatsapp') && recipient.notificationPreferences?.whatsapp && recipient.phone) {
      deliveryPromises.push(
        sendWhatsAppMessage(
          recipient.phone,
          message,
          whatsappOptions?.templateName,
          whatsappOptions?.templateParams
        ).then(result => {
          notification.deliveryStatus.whatsapp = result.success ? 'sent' : 'failed';
          if (result.messageId) {
            notification.metadata = {
              ...notification.metadata,
              whatsappMessageId: result.messageId
            };
          }
          return result;
        })
      );
    } else if (channels.includes('whatsapp')) {
      // WhatsApp was requested but user doesn't have it enabled or no phone
      notification.deliveryStatus.whatsapp = 'failed';
    }

    // Email notification would be implemented here
    if (channels.includes('email') && recipient.notificationPreferences?.email) {
      // Implement email sending logic
      // For now, just mark as sent
      notification.deliveryStatus.email = 'sent';
    } else if (channels.includes('email')) {
      notification.deliveryStatus.email = 'failed';
    }

    // Wait for all delivery promises to resolve
    await Promise.all(deliveryPromises);

    // Update notification with delivery status
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
};

/**
 * Find a notification by WhatsApp message ID
 * @param {string} messageId - The WhatsApp message ID
 * @returns {Promise<Object|null>} - The found notification or null
 */
export const findNotificationByWhatsAppMessageId = async (messageId) => {
  // In a real implementation, this would query the database
  console.log(`[Notification Service] Looking up notification by WhatsApp message ID: ${messageId}`);
  
  // Return a mock notification for development
  return {
    _id: `notification_${Date.now()}`,
    metadata: {
      whatsappMessageId: messageId
    },
    deliveryStatus: {
      whatsapp: 'sent'
    }
  };
};

/**
 * Update a notification's delivery status
 * @param {string} notificationId - The notification ID
 * @param {string} channel - The channel to update (app, email, whatsapp)
 * @param {string} status - The new status
 * @returns {Promise<Object>} - The updated notification
 */
export const updateNotificationStatus = async (notificationId, channel, status) => {
  // In a real implementation, this would update the database
  console.log(`[Notification Service] Updating notification ${notificationId}`);
  console.log(`[Notification Service] Channel: ${channel}, Status: ${status}`);
  
  // Return a mock updated notification
  return {
    _id: notificationId,
    deliveryStatus: {
      [channel]: status
    },
    updatedAt: new Date()
  };
};

export default {
  sendNotification,
  findNotificationByWhatsAppMessageId,
  updateNotificationStatus
};