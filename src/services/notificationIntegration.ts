/**
 * Notification Integration Service
 * 
 * This service integrates the notification system with key platform events
 * such as contests, sales milestones, and rewards.
 */

import { User } from '../contexts/AuthContext';
import notificationService, { NotificationData } from './notificationService';

/**
 * Contest-related notification integrations
 */
export const contestNotifications = {
  /**
   * Send notification when a new contest is created
   * @param contest The contest data
   * @param users The users to notify
   */
  notifyNewContest: async (contest: any, users: User[]) => {
    const data: NotificationData = {
      title: `New Contest: ${contest.title}`,
      message: contest.description || `A new contest has been launched. Join now!`,
      link: `/contests/${contest.id}`,
      contestId: contest.id
    };
    
    return notificationService.sendBulkNotification(users, 'new_contest', data);
  },
  
  /**
   * Send reminder notification for contests ending soon
   * @param contest The contest data
   * @param users The users to notify
   * @param daysLeft Days left before the contest ends
   */
  notifyContestReminder: async (contest: any, users: User[], daysLeft: number) => {
    const data: NotificationData = {
      title: `Reminder: ${contest.title}`,
      message: `This contest ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Submit your sales now!`,
      link: `/contests/${contest.id}`,
      contestId: contest.id,
      daysLeft
    };
    
    return notificationService.sendBulkNotification(users, 'contest_reminder', data);
  },
  
  /**
   * Send notification when a contest ends
   * @param contest The contest data
   * @param users The users to notify
   */
  notifyContestEnded: async (contest: any, users: User[]) => {
    const data: NotificationData = {
      title: `Contest Ended: ${contest.title}`,
      message: `The contest has ended. Check the results!`,
      link: `/contests/${contest.id}/results`,
      contestId: contest.id
    };
    
    return notificationService.sendBulkNotification(users, 'system_announcement', data);
  }
};

/**
 * Sales-related notification integrations
 */
export const salesNotifications = {
  /**
   * Send notification when a user reaches a sales milestone
   * @param user The user who reached the milestone
   * @param milestone The milestone details
   */
  notifySalesMilestone: async (user: User, milestone: { value: number; target: number; type: string }) => {
    const percentage = Math.round((milestone.value / milestone.target) * 100);
    const data: NotificationData = {
      title: 'Sales Milestone Achieved',
      message: `Congratulations! You have reached ${percentage}% of your ${milestone.type} sales target.`,
      link: '/dashboard/sales',
      milestone: `${percentage}% of ${milestone.type} target`,
      milestoneData: milestone
    };
    
    return notificationService.sendNotification(user, 'sales_milestone', data);
  },
  
  /**
   * Send notification when a user submits a new sale
   * @param user The user who submitted the sale
   * @param sale The sale details
   */
  notifySaleSubmitted: async (user: User, sale: any) => {
    const data: NotificationData = {
      title: 'Sale Submitted',
      message: `Your sale for ${sale.productName} has been submitted and is pending verification.`,
      link: `/sales/${sale.id}`,
      saleId: sale.id
    };
    
    return notificationService.sendNotification(user, 'system_announcement', data);
  },
  
  /**
   * Send notification when a sale is verified
   * @param user The user whose sale was verified
   * @param sale The sale details
   */
  notifySaleVerified: async (user: User, sale: any) => {
    const data: NotificationData = {
      title: 'Sale Verified',
      message: `Your sale for ${sale.productName} has been verified. Points have been added to your account.`,
      link: `/sales/${sale.id}`,
      saleId: sale.id
    };
    
    return notificationService.sendNotification(user, 'system_announcement', data);
  }
};

/**
 * Reward-related notification integrations
 */
export const rewardNotifications = {
  /**
   * Send notification when a user earns a reward
   * @param user The user who earned the reward
   * @param reward The reward details
   */
  notifyRewardEarned: async (user: User, reward: any) => {
    const data: NotificationData = {
      title: 'New Reward Earned',
      message: `You have earned the "${reward.name}" for your outstanding performance!`,
      link: '/rewards',
      rewardName: reward.name,
      rewardId: reward.id
    };
    
    return notificationService.sendNotification(user, 'reward_earned', data);
  },
  
  /**
   * Send notification when a user redeems a reward
   * @param user The user who redeemed the reward
   * @param reward The reward details
   */
  notifyRewardRedeemed: async (user: User, reward: any) => {
    const data: NotificationData = {
      title: 'Reward Redeemed',
      message: `You have successfully redeemed the "${reward.name}". Check your email for details.`,
      link: `/rewards/redemptions/${reward.redemptionId}`,
      rewardName: reward.name,
      rewardId: reward.id,
      redemptionId: reward.redemptionId
    };
    
    return notificationService.sendNotification(user, 'system_announcement', data);
  }
};

/**
 * Leaderboard-related notification integrations
 */
export const leaderboardNotifications = {
  /**
   * Send notification when a user's rank changes significantly
   * @param user The user whose rank changed
   * @param newRank The new rank
   * @param oldRank The old rank
   * @param contestName The contest name
   */
  notifyRankChange: async (user: User, newRank: number, oldRank: number, contestName: string) => {
    const improved = newRank < oldRank;
    const data: NotificationData = {
      title: 'Leaderboard Position Update',
      message: improved
        ? `Your position on the leaderboard has improved! You moved from #${oldRank} to #${newRank}.`
        : `Your position on the leaderboard has changed. You moved from #${oldRank} to #${newRank}.`,
      link: '/leaderboard',
      rank: newRank,
      contestName,
      previousRank: oldRank
    };
    
    return notificationService.sendNotification(user, 'leaderboard_update', data);
  },
  
  /**
   * Send notification to top performers
   * @param users The top performing users
   * @param contestName The contest name
   */
  notifyTopPerformers: async (users: User[], contestName: string) => {
    const notifications = users.map((user, index) => {
      const rank = index + 1;
      const data: NotificationData = {
        title: 'Top Performer Recognition',
        message: `Congratulations! You are currently ranked #${rank} in the "${contestName}" contest.`,
        link: '/leaderboard',
        rank,
        contestName
      };
      
      return notificationService.sendNotification(user, 'leaderboard_update', data);
    });
    
    return Promise.all(notifications);
  }
};

/**
 * System-related notification integrations
 */
export const systemNotifications = {
  /**
   * Send welcome notification to a new user
   * @param user The new user
   */
  notifyWelcome: async (user: User) => {
    const data: NotificationData = {
      title: 'Welcome to the Dealer Loyalty Platform',
      message: 'Thank you for joining our platform. Start exploring contests and earning rewards!',
      link: '/dashboard'
    };
    
    return notificationService.sendNotification(user, 'welcome', data);
  },
  
  /**
   * Send system announcement to all users
   * @param users All active users
   * @param announcement The announcement details
   */
  notifySystemAnnouncement: async (users: User[], announcement: { title: string; message: string; link?: string }) => {
    const data: NotificationData = {
      title: announcement.title,
      message: announcement.message,
      link: announcement.link || '/announcements'
    };
    
    return notificationService.sendBulkNotification(users, 'system_announcement', data);
  }
};

// Export all notification integrations
const notificationIntegration = {
  contest: contestNotifications,
  sales: salesNotifications,
  reward: rewardNotifications,
  leaderboard: leaderboardNotifications,
  system: systemNotifications
};

export default notificationIntegration;