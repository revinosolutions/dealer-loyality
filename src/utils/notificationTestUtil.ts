/**
 * Notification Test Utility
 * 
 * This utility provides functions to test the notification system
 * by sending test notifications through different channels.
 */

import { User } from '../contexts/AuthContext';
import notificationService, { 
  NotificationEvent, 
  NotificationData, 
  NotificationType 
} from '../services/notificationService';

/**
 * Send a test notification to a user
 * @param user The user to send the test notification to
 * @param event The notification event type
 * @param channels Optional specific channels to use
 */
export const sendTestNotification = async (
  user: User,
  event: NotificationEvent,
  channels?: NotificationType[]
) => {
  // Create notification data based on event type
  const data: NotificationData = createTestNotificationData(event);
  
  // Send the notification
  return notificationService.sendNotification(user, event, data, channels);
};

/**
 * Send a bulk test notification to multiple users
 * @param users The users to send the test notification to
 * @param event The notification event type
 * @param channels Optional specific channels to use
 */
export const sendBulkTestNotification = async (
  users: User[],
  event: NotificationEvent,
  channels?: NotificationType[]
) => {
  // Create notification data based on event type
  const data: NotificationData = createTestNotificationData(event);
  
  // Send the bulk notification
  return notificationService.sendBulkNotification(users, event, data, channels);
};

/**
 * Create test notification data based on event type
 * @param event The notification event type
 */
const createTestNotificationData = (event: NotificationEvent): NotificationData => {
  switch (event) {
    case 'welcome':
      return {
        title: 'Welcome to the Dealer Loyalty Platform',
        message: 'Thank you for joining our platform. Start exploring contests and earning rewards!',
        link: '/dashboard'
      };
    case 'new_contest':
      return {
        title: 'New Sales Contest Available',
        message: 'A new sales contest "Summer Sales Challenge" has been launched. Join now!',
        link: '/contests/summer-sales',
        contestId: 'test-contest-123'
      };
    case 'contest_reminder':
      return {
        title: 'Contest Ending Soon',
        message: 'The "Summer Sales Challenge" contest ends in 3 days. Submit your sales now!',
        link: '/contests/summer-sales',
        contestId: 'test-contest-123',
        daysLeft: 3
      };
    case 'sales_milestone':
      return {
        title: 'Sales Milestone Achieved',
        message: 'Congratulations! You have reached 80% of your monthly sales target.',
        link: '/dashboard/sales',
        milestone: '80% of monthly target'
      };
    case 'reward_earned':
      return {
        title: 'New Reward Earned',
        message: 'You have earned the "Gold Seller" badge for your outstanding performance!',
        link: '/rewards',
        rewardName: 'Gold Seller Badge',
        rewardId: 'reward-123'
      };
    case 'leaderboard_update':
      return {
        title: 'Leaderboard Position Update',
        message: 'Your position on the leaderboard has improved! You are now ranked #5.',
        link: '/leaderboard',
        rank: 5,
        contestName: 'Summer Sales Challenge',
        previousRank: 8
      };
    case 'system_announcement':
      return {
        title: 'Platform Update',
        message: 'We have added new features to the Dealer Loyalty Platform. Check them out!',
        link: '/announcements/platform-update'
      };
    default:
      return {
        title: 'Test Notification',
        message: 'This is a test notification.',
        link: '/dashboard'
      };
  }
};

/**
 * Generate a series of test notifications for a user
 * @param user The user to generate test notifications for
 */
export const generateTestNotifications = async (user: User) => {
  const events: NotificationEvent[] = [
    'welcome',
    'new_contest',
    'contest_reminder',
    'sales_milestone',
    'reward_earned',
    'leaderboard_update',
    'system_announcement'
  ];
  
  // Send a test notification for each event type
  const results = await Promise.all(
    events.map(event => sendTestNotification(user, event))
  );
  
  return {
    user,
    results: events.reduce((acc, event, index) => {
      acc[event] = results[index];
      return acc;
    }, {} as Record<NotificationEvent, any>)
  };
};

const notificationTestUtil = {
  sendTestNotification,
  sendBulkTestNotification,
  generateTestNotifications
};

export default notificationTestUtil;