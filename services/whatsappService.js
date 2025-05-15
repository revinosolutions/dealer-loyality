/**
 * WhatsApp Service
 * This file provides functionality for interacting with WhatsApp Business API
 * Current implementation is a mock for development purposes
 */

/**
 * Send a WhatsApp message to a recipient
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} message - The message text to send
 * @param {string} templateName - Optional template name to use
 * @param {Object} templateParams - Optional parameters for the template
 * @returns {Promise<Object>} - Response object with success status and messageId
 */
export const sendWhatsAppMessage = async (phoneNumber, message, templateName = null, templateParams = {}) => {
  try {
    console.log(`[WhatsApp Mock] Sending ${templateName ? 'template' : 'message'} to ${phoneNumber}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real implementation, this would call the WhatsApp Business API
    // For now, we'll just return a mock successful response
    
    // Generate a random message ID
    const messageId = `whatsapp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    console.log(`[WhatsApp Mock] Message ID: ${messageId}`);
    
    if (templateName) {
      console.log(`[WhatsApp Mock] Template: ${templateName}`);
      console.log(`[WhatsApp Mock] Template Params:`, templateParams);
    } else {
      console.log(`[WhatsApp Mock] Message: ${message}`);
    }
    
    return {
      success: true,
      messageId,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('WhatsApp service error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get available WhatsApp message templates
 * @returns {Promise<Object>} - Response with templates array
 */
export const getWhatsAppTemplates = async () => {
  try {
    // In a real implementation, this would fetch templates from the WhatsApp Business API
    // For now, return mock templates
    
    return {
      success: true,
      templates: [
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
          name: 'contest_update',
          language: 'en',
          category: 'MARKETING',
          components: [
            {
              type: 'HEADER',
              format: 'TEXT',
              text: 'Contest Update'
            },
            {
              type: 'BODY',
              text: 'Hello {{1}}, you\'re currently in {{2}} place in the "{{3}}" contest! Keep up the good work to win the prize.'
            }
          ]
        }
      ]
    };
  } catch (error) {
    console.error('WhatsApp template service error:', error);
    return {
      success: false,
      error: error.message,
      templates: []
    };
  }
};

/**
 * Verify a WhatsApp webhook signature
 * @param {string} signature - The signature from WhatsApp
 * @param {string} body - The request body
 * @returns {boolean} - Whether the signature is valid
 */
export const verifyWebhook = (signature, body) => {
  // In a real implementation, this would verify the signature
  // For now, return true as a mock
  return true;
};

export default {
  sendWhatsAppMessage,
  getWhatsAppTemplates,
  verifyWebhook
};