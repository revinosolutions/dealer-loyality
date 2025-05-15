import axios from 'axios';
import { User } from '../contexts/AuthContext';

// WhatsApp API configuration
const WHATSAPP_API_URL = process.env.REACT_APP_WHATSAPP_API_URL || 'https://api.whatsapp.com/v1/messages';
const WHATSAPP_API_KEY = process.env.REACT_APP_WHATSAPP_API_KEY || 'your-api-key';

// Message templates
const MESSAGE_TEMPLATES = {
  WELCOME: 'Welcome to the Dealer Loyalty Platform! 🎉 You can now receive important updates and notifications via WhatsApp.',
  NEW_CONTEST: 'New contest alert! 🏆 {{contestName}} has been launched. Check the platform for details and start participating now!',
  CONTEST_REMINDER: 'Reminder: {{contestName}} ends in {{daysLeft}} days. Don\'t miss your chance to win amazing rewards!',
  SALES_MILESTONE: 'Congratulations! 🌟 You\'ve reached {{milestone}} in sales. Keep up the great work!',
  REWARD_EARNED: 'Great news! 🎁 You\'ve earned a new reward: {{rewardName}}. Visit the platform to claim it.',
  LEADERBOARD_UPDATE: 'Leaderboard update: You\'re now ranked #{{rank}} in {{contestName}}. {{message}}',
};

/**
 * Send a WhatsApp message to a user
 * @param user The user to send the message to
 * @param templateName The template name to use
 * @param templateData The data to fill in the template
 */
export const sendWhatsAppMessage = async (
  user: User,
  templateName: keyof typeof MESSAGE_TEMPLATES,
  templateData?: Record<string, string | number>
): Promise<boolean> => {
  try {
    // Skip if user doesn't have a phone number
    if (!user.phone) {
      console.warn(`Cannot send WhatsApp message to user ${user.id}: No phone number provided`);
      return false;
    }

    // Get the template message
    let message = MESSAGE_TEMPLATES[templateName];

    // Replace template variables with actual data
    if (templateData) {
      Object.entries(templateData).forEach(([key, value]) => {
        message = message.replace(`{{${key}}}`, String(value));
      });
    }

    // Format phone number (remove non-numeric characters)
    const formattedPhone = user.phone.replace(/\D/g, '');

    // In a real implementation, this would call the WhatsApp Business API
    // For demo purposes, we'll just log the message and simulate a successful response
    console.log(`[WhatsApp] To: ${formattedPhone}, Message: ${message}`);

    // Simulate API call
    // In production, this would be a real API call to the WhatsApp Business API
    /*
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        phone: formattedPhone,
        message,
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.status === 200;
    */

    // Simulate successful response
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};

/**
 * Send a welcome message to a new user
 * @param user The user to send the welcome message to
 */
export const sendWelcomeMessage = async (user: User): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'WELCOME');
};

/**
 * Send a new contest notification
 * @param user The user to notify
 * @param contestName The name of the new contest
 */
export const sendNewContestNotification = async (
  user: User,
  contestName: string
): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'NEW_CONTEST', { contestName });
};

/**
 * Send a contest reminder notification
 * @param user The user to notify
 * @param contestName The name of the contest
 * @param daysLeft Days left before the contest ends
 */
export const sendContestReminderNotification = async (
  user: User,
  contestName: string,
  daysLeft: number
): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'CONTEST_REMINDER', { contestName, daysLeft });
};

/**
 * Send a sales milestone notification
 * @param user The user to notify
 * @param milestone The milestone achieved (e.g., "$10,000 in monthly sales")
 */
export const sendSalesMilestoneNotification = async (
  user: User,
  milestone: string
): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'SALES_MILESTONE', { milestone });
};

/**
 * Send a reward earned notification
 * @param user The user to notify
 * @param rewardName The name of the earned reward
 */
export const sendRewardEarnedNotification = async (
  user: User,
  rewardName: string
): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'REWARD_EARNED', { rewardName });
};

/**
 * Send a leaderboard update notification
 * @param user The user to notify
 * @param rank The user's current rank
 * @param contestName The name of the contest
 * @param message Additional message (e.g., "Keep it up!" or "You're climbing fast!")
 */
export const sendLeaderboardUpdateNotification = async (
  user: User,
  rank: number,
  contestName: string,
  message: string
): Promise<boolean> => {
  return sendWhatsAppMessage(user, 'LEADERBOARD_UPDATE', { rank, contestName, message });
};

// Export the service
const whatsappService = {
  sendWhatsAppMessage,
  sendWelcomeMessage,
  sendNewContestNotification,
  sendContestReminderNotification,
  sendSalesMilestoneNotification,
  sendRewardEarnedNotification,
  sendLeaderboardUpdateNotification,
};

export default whatsappService;