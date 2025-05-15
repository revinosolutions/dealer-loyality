import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.example.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || 'noreply@example.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'password';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Dealer Loyalty Platform <noreply@example.com>';

/**
 * Notification Delivery Service
 * Handles delivery of notifications through different channels
 * Current implementation uses mocks for development purposes
 */

/**
 * Deliver a notification through multiple channels
 * @param {Object} notification - The notification object from the database
 * @returns {Promise<Object>} - Delivery results for each channel
 */
export const deliverNotification = async (notification) => {
  try {
    const results = {
      app: { success: false },
      email: { success: false },
      whatsapp: { success: false }
    };

    // Process in-app notification (always available)
    if (notification.channels.includes('app')) {
      results.app = await sendInAppNotification(notification);
    }

    // Process email notification if enabled
    if (notification.channels.includes('email')) {
      results.email = await sendEmailNotification(
        notification.recipient,
        notification.title,
        notification.message
      );
    }

    // Process WhatsApp notification if enabled
    if (notification.channels.includes('whatsapp')) {
      // Get recipient's phone number (in real app, would look up from database)
      const recipientPhone = "+1234567890"; // Mock phone number
      
      results.whatsapp = await sendWhatsAppMessage(
        recipientPhone,
        notification.message,
        notification.metadata?.whatsappTemplate,
        notification.metadata?.whatsappParams
      );
    }

    return results;
  } catch (error) {
    console.error('Notification delivery error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sends an email notification (mock implementation)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @returns {Promise<Object>} - Delivery result
 */
export const sendEmailNotification = async (to, subject, text) => {
  try {
    console.log('🔔 [Email Notification Mock]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    
    // Mock successful email sending
    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sends an in-app notification (mock implementation)
 * @param {Object} notification - The notification object
 * @returns {Promise<Object>} - Delivery result
 */
export const sendInAppNotification = async (notification) => {
  try {
    console.log('🔔 [In-App Notification Mock]');
    console.log(`To: ${notification.recipient}`);
    console.log(`Title: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    
    // Mock successful in-app notification
    return {
      success: true,
      deliveryId: `app_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('In-app notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process notification delivery queue (mock implementation)
 * @returns {Promise<void>}
 */
export const processNotificationQueue = async () => {
  try {
    console.log('Processing notification queue');
    
    // Import required models
    const Notification = mongoose.models.Notification || mongoose.model('Notification');
    const User = mongoose.models.User || mongoose.model('User');
    
    // Find pending notifications
    const pendingNotifications = await Notification.find({
      $or: [
        { 'deliveryStatus.email': 'pending' },
        { 'deliveryStatus.whatsapp': 'pending' }
      ]
    }).limit(50);  // Process in batches
    
    console.log(`Found ${pendingNotifications.length} pending notifications to process`);
    
    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Get the recipient
        const recipient = await User.findById(notification.recipient);
        
        if (!recipient) {
          console.error(`Recipient not found for notification ${notification._id}`);
          notification.deliveryStatus.email = 'failed';
          notification.deliveryStatus.whatsapp = 'failed';
          await notification.save();
          continue;
        }
        
        // Process email notifications
        if (notification.deliveryStatus.email === 'pending') {
          try {
            // In a real implementation, you would send the actual email here
            console.log(`Sending email notification to ${recipient.email}: ${notification.title}`);
            
            // For purchase request status changes, add special formatting
            let emailBody = notification.message;
            
            if (notification.type === 'purchase_request_rejected') {
              // Extract the rejection reason from the message
              let rejectionReason = "No specific reason provided.";
              if (notification.message.includes(': ')) {
                rejectionReason = notification.message.split(': ')[1];
              }
              
              emailBody = `
                <h2>Purchase Request Rejected</h2>
                <p>Dear ${recipient.name || recipient.email},</p>
                <p>Your purchase request has been <strong>rejected</strong>.</p>
                <p><strong>Reason:</strong> ${rejectionReason}</p>
                <p>If you have any questions, please contact your administrator.</p>
                <p>You can view the details in your dashboard.</p>
              `;
              
              // Log for debugging
              console.log(`Rejection reason: ${rejectionReason}`);
            } else if (notification.type === 'purchase_request_approved') {
              emailBody = `
                <h2>Purchase Request Approved</h2>
                <p>Dear ${recipient.name || recipient.email},</p>
                <p>Good news! Your purchase request has been <strong>approved</strong>.</p>
                <p>${notification.message}</p>
                <p>The items have been added to your inventory.</p>
              `;
            }
            
            // Simulate sending email
            console.log(`Email body: ${emailBody}`);
            
            // Mark as sent
            notification.deliveryStatus.email = 'sent';
            
            // Also mark app notification as sent for purchase request notifications
            if (notification.type === 'purchase_request_rejected' || notification.type === 'purchase_request_approved') {
              notification.deliveryStatus.app = 'sent';
            }
          } catch (emailErr) {
            console.error(`Failed to send email notification ${notification._id}:`, emailErr);
            notification.deliveryStatus.email = 'failed';
          }
        }
        
        // Process WhatsApp notifications
        if (notification.deliveryStatus.whatsapp === 'pending') {
          try {
            // In a real implementation, you would send the actual WhatsApp message here
            console.log(`Sending WhatsApp notification to ${recipient.phone}: ${notification.title}`);
            
            // Mark as sent
            notification.deliveryStatus.whatsapp = 'sent';
          } catch (whatsappErr) {
            console.error(`Failed to send WhatsApp notification ${notification._id}:`, whatsappErr);
            notification.deliveryStatus.whatsapp = 'failed';
          }
        }
        
        // Always mark in-app notification as delivered unless already done
        if (notification.deliveryStatus.app === 'pending') {
          notification.deliveryStatus.app = 'sent';
        }
        
        // Save the updated notification
        await notification.save();
        console.log(`Processed notification ${notification._id}`);
      } catch (notificationErr) {
        console.error(`Error processing notification ${notification._id}:`, notificationErr);
      }
    }
    
    console.log('Notification queue processing completed');
  } catch (error) {
    console.error('Notification queue processing error:', error);
  }
};

export default {
  deliverNotification,
  sendEmailNotification,
  sendInAppNotification,
  processNotificationQueue
};