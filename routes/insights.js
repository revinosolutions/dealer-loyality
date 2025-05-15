import express from 'express';
import Sales from '../models/Sales.js';
import User from '../models/User.js';
import Contest from '../models/Contest.js';
import Reward from '../models/Reward.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get AI insights for dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Build query based on user role
    let salesQuery = {};
    let userQuery = {};
    
    if (req.user.role === 'dealer') {
      salesQuery.userId = req.user.id;
      userQuery._id = req.user.id;
    } else if (req.user.role === 'client') {
      salesQuery.clientId = req.user.id;
      userQuery.clientId = req.user.id;
      userQuery.role = 'dealer';
    }

    // Get date ranges for analysis
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);
    const ninetyDaysAgo = new Date(currentDate);
    ninetyDaysAgo.setDate(currentDate.getDate() - 90);

    // Get sales data for analysis
    const salesData = await Sales.find({
      ...salesQuery,
      date: { $gte: ninetyDaysAgo },
      status: 'completed'
    }).sort('date');

    // Get user data
    const userData = await User.find(userQuery).select('name points stats pointsHistory');

    // Generate insights based on the data
    const insights = [];

    // 1. Sales trend analysis
    if (salesData.length > 0) {
      // Group sales by week
      const salesByWeek = salesData.reduce((acc, sale) => {
        const date = new Date(sale.date);
        const weekNumber = Math.ceil((date.getDate() + date.getDay()) / 7);
        const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
        const key = `${weekNumber}-${monthYear}`;
        
        if (!acc[key]) {
          acc[key] = { total: 0, count: 0, week: weekNumber, month: date.getMonth() + 1, year: date.getFullYear() };
        }
        acc[key].total += sale.amount;
        acc[key].count += 1;
        return acc;
      }, {});

      // Convert to array and sort by date
      const weeklySales = Object.values(salesByWeek).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.week - b.week;
      });

      // Analyze trend
      if (weeklySales.length >= 2) {
        const lastWeek = weeklySales[weeklySales.length - 1];
        const previousWeek = weeklySales[weeklySales.length - 2];
        
        const percentChange = ((lastWeek.total - previousWeek.total) / previousWeek.total) * 100;
        
        insights.push({
          type: 'sales_trend',
          title: 'Sales Trend',
          message: percentChange > 0 
            ? `Sales are up ${percentChange.toFixed(1)}% compared to last week. Keep up the good work!`
            : `Sales are down ${Math.abs(percentChange).toFixed(1)}% compared to last week. Consider running a promotion.`,
          data: {
            percentChange: parseFloat(percentChange.toFixed(1)),
            trend: percentChange > 0 ? 'up' : 'down',
            weeklySales: weeklySales.slice(-8) // Last 8 weeks
          }
        });
      }
    }

    // 2. Top performing dealers (for clients)
    if (req.user.role === 'client' && userData.length > 0) {
      // Sort dealers by points
      const topDealers = [...userData].sort((a, b) => b.points - a.points).slice(0, 5);
      
      insights.push({
        type: 'top_performers',
        title: 'Top Performing Dealers',
        message: `Your top dealer ${topDealers[0]?.name || 'N/A'} has earned ${topDealers[0]?.points || 0} points. Consider recognizing their achievement.`,
        data: {
          topDealers: topDealers.map(dealer => ({
            id: dealer._id,
            name: dealer.name,
            points: dealer.points
          }))
        }
      });
    }

    // 3. Engagement recommendations
    const lowEngagementUsers = userData.filter(user => {
      // Check if user has been inactive
      const lastActive = user.stats?.lastActive ? new Date(user.stats.lastActive) : null;
      return !lastActive || (currentDate - lastActive) > (14 * 24 * 60 * 60 * 1000); // 14 days
    });

    if (lowEngagementUsers.length > 0) {
      insights.push({
        type: 'engagement',
        title: 'Engagement Opportunity',
        message: `${lowEngagementUsers.length} ${req.user.role === 'client' ? 'dealers have' : 'users have'} been inactive for over 2 weeks. Consider sending them a notification or creating a special contest.`,
        data: {
          inactiveCount: lowEngagementUsers.length,
          inactiveUsers: lowEngagementUsers.map(user => ({
            id: user._id,
            name: user.name
          }))
        }
      });
    }

    // 4. Reward redemption patterns
    if (req.user.role === 'client') {
      const rewards = await Reward.find({ clientId: req.user.id });
      
      // Find popular and unpopular rewards
      const popularRewards = rewards
        .filter(reward => reward.redemptions.length > 0)
        .sort((a, b) => b.redemptions.length - a.redemptions.length);
      
      const unpopularRewards = rewards
        .filter(reward => reward.isActive && reward.redemptions.length === 0 && 
                new Date(reward.createdAt) < thirtyDaysAgo);
      
      if (popularRewards.length > 0) {
        insights.push({
          type: 'popular_rewards',
          title: 'Popular Rewards',
          message: `"${popularRewards[0].title}" is your most popular reward with ${popularRewards[0].redemptions.length} redemptions. Consider creating similar rewards.`,
          data: {
            topRewards: popularRewards.slice(0, 3).map(reward => ({
              id: reward._id,
              title: reward.title,
              redemptions: reward.redemptions.length
            }))
          }
        });
      }
      
      if (unpopularRewards.length > 0) {
        insights.push({
          type: 'unpopular_rewards',
          title: 'Underperforming Rewards',
          message: `${unpopularRewards.length} rewards have had no redemptions in the past 30 days. Consider updating or replacing them.`,
          data: {
            unpopularRewards: unpopularRewards.map(reward => ({
              id: reward._id,
              title: reward.title,
              pointsCost: reward.pointsCost
            }))
          }
        });
      }
    }

    // 5. Contest participation insights
    if (req.user.role === 'client') {
      const contests = await Contest.find({ 
        clientId: req.user.id,
        status: { $in: ['active', 'completed'] },
        endDate: { $gte: thirtyDaysAgo }
      });
      
      if (contests.length > 0) {
        // Calculate average participation rate
        const totalDealers = await User.countDocuments({ clientId: req.user.id, role: 'dealer' });
        
        if (totalDealers > 0) {
          const participationRates = contests.map(contest => {
            return (contest.participants.length / totalDealers) * 100;
          });
          
          const avgParticipation = participationRates.reduce((sum, rate) => sum + rate, 0) / participationRates.length;
          
          insights.push({
            type: 'contest_participation',
            title: 'Contest Participation',
            message: avgParticipation < 50 
              ? `Your contest participation rate is ${avgParticipation.toFixed(1)}%, which is lower than optimal. Consider simplifying contest goals or increasing rewards.`
              : `Your contest participation rate is ${avgParticipation.toFixed(1)}%. Your dealers are engaged with your contests!`,
            data: {
              participationRate: parseFloat(avgParticipation.toFixed(1)),
              totalDealers,
              contests: contests.map(contest => ({
                id: contest._id,
                title: contest.title,
                participantCount: contest.participants.length,
                participationRate: parseFloat(((contest.participants.length / totalDealers) * 100).toFixed(1))
              }))
            }
          });
        }
      }
    }

    // 6. Points economy insights (for clients)
    if (req.user.role === 'client' && userData.length > 0) {
      // Calculate total points in the system
      const totalPoints = userData.reduce((sum, user) => sum + user.points, 0);
      
      // Calculate points earned vs spent in last 30 days
      let pointsEarned = 0;
      let pointsSpent = 0;
      
      userData.forEach(user => {
        user.pointsHistory.forEach(record => {
          if (new Date(record.date) >= thirtyDaysAgo) {
            if (record.type === 'earned') {
              pointsEarned += record.amount;
            } else if (record.type === 'spent') {
              pointsSpent += Math.abs(record.amount);
            }
          }
        });
      });
      
      const pointsRatio = pointsSpent > 0 ? (pointsEarned / pointsSpent) : 0;
      
      insights.push({
        type: 'points_economy',
        title: 'Points Economy',
        message: pointsRatio < 0.8 
          ? `Your dealers are redeeming more points (${pointsSpent}) than they're earning (${pointsEarned}). This is good for engagement but watch your reward inventory.`
          : pointsRatio > 1.5 
            ? `Your dealers have earned ${pointsEarned} points but only redeemed ${pointsSpent}. Consider adding more attractive rewards to increase redemptions.`
            : `Your points economy is balanced with ${pointsEarned} points earned and ${pointsSpent} points redeemed in the last 30 days.`,
        data: {
          totalPoints,
          pointsEarned,
          pointsSpent,
          pointsRatio: parseFloat(pointsRatio.toFixed(2))
        }
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get personalized recommendations for dealers
router.get('/recommendations', authMiddleware, authorize(['dealer']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get available rewards
    const availableRewards = await Reward.find({
      clientId: user.clientId,
      isActive: true,
      $or: [
        { expiryDate: { $gt: new Date() } },
        { expiryDate: null }
      ],
      $or: [
        { quantity: { $gt: 0 } },
        { quantity: -1 } // Unlimited
      ]
    }).sort('pointsCost');

    // Get active contests
    const activeContests = await Contest.find({
      clientId: user.clientId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    // Generate recommendations
    const recommendations = [];

    // 1. Affordable rewards
    const affordableRewards = availableRewards.filter(reward => reward.pointsCost <= user.points);
    if (affordableRewards.length > 0) {
      recommendations.push({
        type: 'affordable_rewards',
        title: 'Rewards You Can Redeem Now',
        message: `You have ${user.points} points and can redeem ${affordableRewards.length} rewards right now!`,
        data: affordableRewards.slice(0, 3).map(reward => ({
          id: reward._id,
          title: reward.title,
          description: reward.description,
          pointsCost: reward.pointsCost,
          image: reward.image
        }))
      });
    }

    // 2. Points goal recommendations
    if (availableRewards.length > 0 && affordableRewards.length < availableRewards.length) {
      // Find the next reward the user can't afford yet
      const nextReward = availableRewards.find(reward => reward.pointsCost > user.points);
      if (nextReward) {
        const pointsNeeded = nextReward.pointsCost - user.points;
        recommendations.push({
          type: 'points_goal',
          title: 'Next Reward Goal',
          message: `You need ${pointsNeeded} more points to redeem "${nextReward.title}".`,
          data: {
            reward: {
              id: nextReward._id,
              title: nextReward.title,
              pointsCost: nextReward.pointsCost,
              image: nextReward.image
            },
            currentPoints: user.points,
            pointsNeeded
          }
        });
      }
    }

    // 3. Contest recommendations
    if (activeContests.length > 0) {
      // Find contests the user hasn't joined yet
      const unjoinedContests = activeContests.filter(contest => 
        !contest.participants.some(p => p.userId.toString() === user.id)
      );

      if (unjoinedContests.length > 0) {
        recommendations.push({
          type: 'available_contests',
          title: 'Available Contests',
          message: `There are ${unjoinedContests.length} active contests you haven't joined yet.`,
          data: unjoinedContests.map(contest => ({
            id: contest._id,
            title: contest.title,
            description: contest.description,
            endDate: contest.endDate,
            reward: contest.reward
          }))
        });
      }

      // Find contests the user has joined and is close to winning
      const joinedContests = activeContests.filter(contest => 
        contest.participants.some(p => p.userId.toString() === user.id)
      );

      if (joinedContests.length > 0) {
        const closeContests = joinedContests.filter(contest => {
          const participant = contest.participants.find(p => p.userId.toString() === user.id);
          return participant && participant.progress >= 70 && participant.progress < 100;
        });

        if (closeContests.length > 0) {
          recommendations.push({
            type: 'contest_progress',
            title: 'Almost There!',
            message: `You're close to winning ${closeContests.length} contests. Keep going!`,
            data: closeContests.map(contest => {
              const participant = contest.participants.find(p => p.userId.toString() === user.id);
              return {
                id: contest._id,
                title: contest.title,
                progress: participant.progress,
                reward: contest.reward
              };
            })
          });
        }
      }
    }

    // 4. Activity recommendations
    const lastActive = user.stats?.lastActive ? new Date(user.stats.lastActive) : null;
    const daysSinceActive = lastActive ? Math.floor((new Date() - lastActive) / (24 * 60 * 60 * 1000)) : 30;

    if (daysSinceActive > 7) {
      recommendations.push({
        type: 'activity_reminder',
        title: 'Welcome Back!',
        message: `It's been ${daysSinceActive} days since your last activity. Record a sale to earn points!`,
        data: {
          daysSinceActive
        }
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined insights routes
router.use((req, res) => {
  res.status(404).json({ message: 'Insights endpoint not found' });
});

export default router;
