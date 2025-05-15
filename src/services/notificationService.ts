import { User } from '../contexts/AuthContext';
import whatsappService from './whatsappService';

// Notification types
export type NotificationType = 'email' | 'push' | 'sms' | 'whatsapp';

// User notification preferences
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  [key: string]: boolean;
}

// Notification event types
export type NotificationEvent = 
  | 'welcome'
  | 'new_contest'
  | 'contest_reminder'
  | 'sales_milestone'
  | 'reward_earned'
  | 'leaderboard_update'
  | 'system_announcement';

// Notification data interface
export interface NotificationData {
  title: string;
  message: string;
  link?: string;
  timestamp?: Date;
  read?: boolean;
  [key: string]: any; // Additional data specific to the notification type
}

// Notification result interface
export interface NotificationResult {
  success: boolean;
  channel: NotificationType;
  error?: string;
  timestamp: Date;
}

// Stored notification interface for notification center
export interface StoredNotification {
  id: string;
  userId: string;
  type: NotificationEvent;
  data: NotificationData;
  read: boolean;
  createdAt: Date;
}

/**
 * Send a notification to a user through multiple channels based on their preferences
 * @param user The user to notify
 * @param event The notification event type
 * @param data The notification data
 * @param channels The channels to send the notification through (defaults to all enabled channels)
 */
/**
 * Get user notification preferences
 * In a real app, this would fetch from a database
 * @param userId The user ID to get preferences for
 */
export const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  // In a real implementation, this would fetch from a database
  // For now, we'll return default preferences
  return {
    email: true,
    push: true,
    sms: false,
    whatsapp: true,
  };
};

/**
 * Save user notification preferences
 * @param userId The user ID to save preferences for
 * @param preferences The notification preferences to save
 */
export const saveUserNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<boolean> => {
  // In a real implementation, this would save to a database
  console.log(`Saving notification preferences for user ${userId}:`, preferences);
  return true;
};

/**
 * Send a notification to a user through multiple channels based on their preferences
 * @param user The user to notify
 * @param event The notification event type
 * @param data The notification data
 * @param channels The channels to send the notification through (defaults to all enabled channels)
 */
export const sendNotification = async (
  user: User,
  event: NotificationEvent,
  data: NotificationData,
  channels?: NotificationType[]
): Promise<Record<NotificationType, NotificationResult>> => {
  try {
    // Get user notification preferences
    const userPreferences = await getUserNotificationPreferences(user.id);
    
    // Set timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = new Date();
    }
    
    // Store notification in notification center
    await storeNotification(user.id, event, data);
    
    // Determine which channels to use
    const enabledChannels = channels || 
      (Object.entries(userPreferences)
        .filter(([_, enabled]) => enabled)
        .map(([channel]) => channel as NotificationType));

    // Initialize results
    const results: Record<NotificationType, NotificationResult> = {
      email: { success: false, channel: 'email', timestamp: new Date() },
      push: { success: false, channel: 'push', timestamp: new Date() },
      sms: { success: false, channel: 'sms', timestamp: new Date() },
      whatsapp: { success: false, channel: 'whatsapp', timestamp: new Date() },
    };

    // Send notifications through each enabled channel
    await Promise.all(
      enabledChannels.map(async (channel) => {
        // Skip if user has disabled this channel
        if (!userPreferences[channel]) return;

        try {
          let success = false;
          
          switch (channel) {
            case 'whatsapp':
              success = await sendWhatsAppNotification(user, event, data);
              results.whatsapp = { 
                success, 
                channel: 'whatsapp', 
                timestamp: new Date() 
              };
              break;
            case 'email':
              success = await sendEmailNotification(user, event, data);
              results.email = { 
                success, 
                channel: 'email', 
                timestamp: new Date() 
              };
              break;
            case 'push':
              success = await sendPushNotification(user, event, data);
              results.push = { 
                success, 
                channel: 'push', 
                timestamp: new Date() 
              };
              break;
            case 'sms':
              success = await sendSmsNotification(user, event, data);
              results.sms = { 
                success, 
                channel: 'sms', 
                timestamp: new Date() 
              };
              break;
          }
        } catch (error) {
          // Log the error and continue with other channels
          console.error(`Error sending ${channel} notification:`, error);
          results[channel] = { 
            success: false, 
            channel, 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date() 
          };
        }
      })
    );

    return results;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    throw error;
  }
};

/**
 * Send a WhatsApp notification
 */
const sendWhatsAppNotification = async (
  user: User,
  event: NotificationEvent,
  data: NotificationData
): Promise<boolean> => {
  switch (event) {
    case 'welcome':
      return whatsappService.sendWelcomeMessage(user);
    case 'new_contest':
      return whatsappService.sendNewContestNotification(user, data.title);
    case 'contest_reminder':
      return whatsappService.sendContestReminderNotification(
        user,
        data.title,
        data.daysLeft || 7
      );
    case 'sales_milestone':
      return whatsappService.sendSalesMilestoneNotification(user, data.milestone);
    case 'reward_earned':
      return whatsappService.sendRewardEarnedNotification(user, data.rewardName);
    case 'leaderboard_update':
      return whatsappService.sendLeaderboardUpdateNotification(
        user,
        data.rank,
        data.contestName,
        data.message
      );
    default:
      // For other events, send a generic message
      return whatsappService.sendWhatsAppMessage(user, 'WELCOME', {
        message: `${data.title}: ${data.message}`,
      });
  }
};

/**
 * Send an email notification
 * In a real implementation, this would use an email service
 */
const sendEmailNotification = async (
  user: User,
  event: NotificationEvent,
  data: NotificationData
): Promise<boolean> => {
  // In a real implementation, this would send an email
  console.log(`[Email] To: ${user.email}, Subject: ${data.title}, Message: ${data.message}`);
  return true;
};

/**
 * Send a push notification
 * In a real implementation, this would use a push notification service
 */
const sendPushNotification = async (
  user: User,
  event: NotificationEvent,
  data: NotificationData
): Promise<boolean> => {
  // In a real implementation, this would send a push notification
  console.log(`[Push] To: ${user.id}, Title: ${data.title}, Message: ${data.message}`);
  return true;
};

/**
 * Send an SMS notification
 * In a real implementation, this would use an SMS service
 */
const sendSmsNotification = async (
  user: User,
  event: NotificationEvent,
  data: NotificationData
): Promise<boolean> => {
  // In a real implementation, this would send an SMS
  if (!user.phone) return false;
  console.log(`[SMS] To: ${user.phone}, Message: ${data.title}: ${data.message}`);
  return true;
};

/**
 * Store a notification in the notification center
 * @param userId The user ID to store the notification for
 * @param event The notification event type
 * @param data The notification data
 */
export const storeNotification = async (
  userId: string,
  event: NotificationEvent,
  data: NotificationData
): Promise<StoredNotification> => {
  // In a real implementation, this would store in a database
  const notification: StoredNotification = {
    id: Math.random().toString(36).substring(2, 15),
    userId,
    type: event,
    data,
    read: false,
    createdAt: new Date(),
  };
  
  console.log(`Storing notification for user ${userId}:`, notification);
  return notification;
};

/**
 * Get notifications for a user
 * @param userId The user ID to get notifications for
 * @param limit The maximum number of notifications to return
 * @param offset The offset to start from
 * @param unreadOnly Whether to only return unread notifications
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<StoredNotification[]> => {
  // In a real implementation, this would fetch from a database
  // For now, we'll return an empty array
  return [];
};

/**
 * Mark a notification as read
 * @param notificationId The notification ID to mark as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  // In a real implementation, this would update in a database
  console.log(`Marking notification ${notificationId} as read`);
  return true;
};

/**
 * Mark all notifications for a user as read
 * @param userId The user ID to mark all notifications as read for
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  // In a real implementation, this would update in a database
  console.log(`Marking all notifications for user ${userId} as read`);
  return true;
};

/**
 * Send a notification to multiple users
 * @param users The users to notify
 * @param event The notification event type
 * @param data The notification data
 * @param channels The channels to send the notification through
 */
export const sendBulkNotification = async (
  users: User[],
  event: NotificationEvent,
  data: NotificationData,
  channels?: NotificationType[]
): Promise<Record<string, Record<NotificationType, NotificationResult>>> => {
  const results: Record<string, Record<NotificationType, NotificationResult>> = {};
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    // Send notifications to each user in the batch
    const batchResults = await Promise.all(
      batch.map(async (user) => {
        try {
          const result = await sendNotification(user, event, data, channels);
          return { userId: user.id, result };
        } catch (error) {
          console.error(`Error sending notification to user ${user.id}:`, error);
          return { 
            userId: user.id, 
            result: {
              email: { success: false, channel: 'email', error: String(error), timestamp: new Date() },
              push: { success: false, channel: 'push', error: String(error), timestamp: new Date() },
              sms: { success: false, channel: 'sms', error: String(error), timestamp: new Date() },
              whatsapp: { success: false, channel: 'whatsapp', error: String(error), timestamp: new Date() },
            } 
          };
        }
      })
    );
    
    // Add batch results to overall results
    batchResults.forEach(({ userId, result }) => {
      results[userId] = result;
    });
  }
  
  return results;
};

// Export the notification service
const notificationService = {
  sendNotification,
  sendBulkNotification,
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  storeNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

export default notificationService;