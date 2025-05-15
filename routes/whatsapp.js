import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authMiddleware, authorize } from '../middleware/auth.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { getWhatsAppTemplates } from '../services/whatsappService.js';

const router = express.Router();

// Validation middleware
const validateWhatsAppMessage = [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('templateName').optional().isString().withMessage('Template name must be a string')
];

// Send WhatsApp message
router.post('/send', authMiddleware, authorize(['admin', 'client']), validateWhatsAppMessage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipient, message, templateName, templateParams, notificationId } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if client is sending to their own dealer
    if (req.user.role === 'client' && recipientUser.role === 'dealer' && 
        recipientUser.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if recipient has WhatsApp notifications enabled
    if (!recipientUser.notificationPreferences?.whatsapp) {
      return res.status(400).json({ message: 'Recipient has WhatsApp notifications disabled' });
    }

    // Check if recipient has a phone number
    if (!recipientUser.phone) {
      return res.status(400).json({ message: 'Recipient has no phone number registered' });
    }

    let result;
    
    // If this is linked to an existing notification, update it
    if (notificationId) {
      try {
        const notification = await Notification.findById(notificationId);
        if (!notification || notification.recipient.toString() !== recipient) {
          return res.status(404).json({ message: 'Notification not found or recipient mismatch' });
        }
        
        // Use WhatsApp service directly
        const whatsappResponse = await sendWhatsAppMessage(
          recipientUser.phone,
          message,
          templateName,
          templateParams
        );
        
        // Update notification status
        notification.deliveryStatus.whatsapp = whatsappResponse.success ? 'sent' : 'failed';
        if (whatsappResponse.messageId) {
          notification.metadata = {
            ...notification.metadata,
            whatsappMessageId: whatsappResponse.messageId
          };
        }
        
        await notification.save();
        result = { notification, whatsappResponse };
      } catch (error) {
        console.error('Error updating notification with WhatsApp status:', error);
        return res.status(500).json({ message: 'Failed to update notification' });
      }
    } else {
      // Create a new notification using the notification service
      try {
        // Import the notification service
        const { sendNotification } = await import('../services/notificationService.js');
        
        // Send notification through the service
        const notification = await sendNotification({
          recipientId: recipient,
          senderId: req.user.id,
          type: 'system',
          title: templateName || 'WhatsApp Message',
          message,
          channels: ['whatsapp'],
          whatsappOptions: {
            templateName,
            templateParams
          }
        });
        
        result = { notification };
      } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ message: 'Failed to send notification' });
      }
    }

    // Log the message for debugging (would be removed in production)
    console.log(`WhatsApp message ${templateName ? 'template' : 'text'} sent to ${recipientUser.phone}:`, 
      templateName || message);

    res.json({
      message: 'WhatsApp message sent successfully',
      result
    });
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Webhook for WhatsApp status updates
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature if provided
    // This would be implemented with the actual WhatsApp Business API
    const signature = req.headers['x-hub-signature'];
    
    // Process the webhook payload
    const { object, entry } = req.body;
    
    if (object === 'whatsapp_business_account') {
      // Process status updates
      for (const entryData of entry || []) {
        for (const change of entryData.changes || []) {
          if (change.field === 'messages') {
            for (const statusUpdate of change.value.statuses || []) {
              // Extract the message ID and status
              const { id: messageId, status, timestamp, recipient_id } = statusUpdate;
              
              // Update notification status in the database
              if (messageId) {
                try {
                  // Import the notification service
                  const { findNotificationByWhatsAppMessageId, updateNotificationStatus } = await import('../services/notificationService.js');
                  
                  // Find notification by WhatsApp message ID
                  const notification = await findNotificationByWhatsAppMessageId(messageId);
                  
                  if (notification) {
                    // Update the notification status
                    await updateNotificationStatus(
                      notification._id,
                      'whatsapp',
                      mapWhatsAppStatus(status)
                    );
                    
                    console.log(`WhatsApp message ${messageId} status updated to ${status}`);
                  } else {
                    console.log(`No notification found for WhatsApp message ID: ${messageId}`);
                  }
                } catch (serviceError) {
                  console.error('Error updating notification status:', serviceError);
                }
              }
            }
          }
        }
      }
    }
    
    // Always respond with 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    // Still return 200 to prevent WhatsApp from retrying
    res.status(200).send('OK');
  }
});

// Helper function to map WhatsApp statuses to our notification statuses
function mapWhatsAppStatus(whatsappStatus) {
  const statusMap = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  };
  return statusMap[whatsappStatus] || 'pending';
}

// Get WhatsApp templates (for clients to use)
router.get('/templates', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    // Use the WhatsApp service to fetch templates
   
    
    const response = await getWhatsAppTemplates();
    
    if (!response.success) {
      return res.status(500).json({ message: 'Failed to fetch WhatsApp templates', error: response.error });
    }
    
    const templates = response.templates || [
      {
        name: 'welcome_message',
        language: 'en',
        category: 'MARKETING',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Welcome to our Loyalty Program!'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, welcome to our dealer loyalty program. You now have access to exclusive rewards and contests.'
          }
        ]
      },
      {
        name: 'reward_notification',
        language: 'en',
        category: 'MARKETING',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'New Reward Available!'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, a new reward "{{2}}" is now available for {{3}} points. Log in to redeem it!'
          }
        ]
      },
      {
        name: 'achievement_unlocked',
        language: 'en',
        category: 'MARKETING',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Achievement Unlocked!'
          },
          {
            type: 'BODY',
            text: 'Congratulations {{1}}! You\'ve earned the "{{2}}" achievement and {{3}} points have been added to your account.'
          }
        ]
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Get WhatsApp templates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined WhatsApp routes
router.use((req, res) => {
  res.status(404).json({ message: 'WhatsApp endpoint not found' });
});

export default router;
