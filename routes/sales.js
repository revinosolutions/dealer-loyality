import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Sales from '../models/Sales.js';
import User from '../models/User.js';
import Contest from '../models/Contest.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateSale = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('type').notEmpty().withMessage('Sale type is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
];

// Get sales data (daily, weekly, monthly)
router.get('/data', authMiddleware, async (req, res) => {
  try {
    // Validate period parameter
    const { period = 'daily' } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period parameter. Must be daily, weekly, or monthly.' });
    }

    // Calculate date ranges properly
    const currentDate = new Date();
    let startDate;

    // Set date range based on period
    switch (period) {
      case 'weekly':
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 1);
        break;
      default: // daily
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 30);
    }

    // Build query based on user role
    let query = {
      date: { $gte: startDate },
      status: 'completed'
    };

    // Apply role-based access control
    if (req.user.role === 'dealer') {
      query.userId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }
    // Super admin can see all sales data

    // Fetch sales data with error handling
    const sales = await Sales.find(query).sort('date');
    
    if (!sales || sales.length === 0) {
      return res.json([]);
    }

    // Process and format data based on period
    const formattedData = sales.reduce((acc, sale) => {
      const date = new Date(sale.date);
      let key;

      switch (period) {
        case 'weekly':
          // Better week calculation
          const weekNumber = Math.ceil((date.getDate() + (new Date(date.getFullYear(), date.getMonth(), 1).getDay())) / 7);
          key = `Week ${weekNumber}`;
          break;
        case 'monthly':
          key = date.toLocaleString('default', { month: 'short' });
          break;
        default: // daily
          key = date.toLocaleString('default', { weekday: 'short' });
      }

      if (!acc[key]) {
        acc[key] = { value: 0, count: 0 };
      }
      acc[key].value += sale.amount;
      acc[key].count += 1;
      return acc;
    }, {});

    // Transform data for response
    const result = Object.entries(formattedData).map(([key, data]) => ({
      [period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day']: key,
      value: Number(data.value.toFixed(2)),
      count: data.count
    }));

    res.json(result);
  } catch (error) {
    console.error('Get sales data error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve sales data', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    // Build query based on user role
    let query = { role: 'dealer' };
    
    // Apply role-based filtering
    if (req.user.role === 'client') {
      query.clientId = req.user.id;
    } else if (req.user.role === 'dealer') {
      // Dealers can only see leaderboard for their client
      if (!req.user.clientId) {
        return res.status(400).json({ message: 'Dealer is not associated with any client' });
      }
      query.clientId = req.user.clientId;
    }
    // Super admin can see all dealers

    // Optional time period filtering
    const { period } = req.query;
    if (period) {
      const currentDate = new Date();
      let startDate;
      
      switch (period) {
        case 'weekly':
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(currentDate);
          startDate.setMonth(currentDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate = new Date(currentDate);
          startDate.setFullYear(currentDate.getFullYear() - 1);
          break;
        default:
          // Invalid period parameter, ignore filtering
          break;
      }
      
      if (startDate) {
        // This would require a more complex aggregation to calculate points within a time period
        // For now, we'll just use the total points
      }
    }

    // Fetch leaders with error handling
    const leaders = await User.find(query)
      .select('name points avatar')
      .sort('-points')
      .limit(10);

    if (!leaders || leaders.length === 0) {
      return res.json([]);
    }

    // Format the response
    const formattedLeaders = leaders.map((leader, index) => ({
      id: leader._id,
      name: leader.name,
      points: leader.points,
      rank: index + 1,
      avatar: leader.avatar,
      change: 0 // This could be calculated by comparing with previous rankings
    }));

    res.json(formattedLeaders);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve leaderboard data', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Record new sale
router.post(
  '/',
  authMiddleware,
  authorize(['dealer']),
  validateSale,
  async (req, res) => {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate dealer exists and belongs to the specified client
      const dealer = await User.findById(req.user.id).session(session);
      if (!dealer) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Dealer not found' });
      }

      if (!dealer.clientId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Dealer is not associated with any client' });
      }

      // Calculate points based on sale amount
      const pointsEarned = Math.floor(req.body.amount * 0.1);

      const sale = new Sales({
        ...req.body,
        userId: req.user.id,
        clientId: dealer.clientId,
        userRole: req.user.role,
        points: pointsEarned,
        date: req.body.date || new Date()
      });

      // Save the sale within the transaction
      await sale.save({ session });

      // Update user points within the transaction
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { 
          $inc: { points: pointsEarned },
          $push: { 
            pointsHistory: {
              amount: pointsEarned,
              type: 'earned',
              source: 'sales',
              sourceId: sale._id,
              description: `Points earned from sale: ${sale._id}`
            }
          }
        },
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: 'Failed to update user points' });
      }

      // Create notification for client about the new sale
      try {
        // Import Notification model if not already imported
        const Notification = mongoose.models.Notification || (await import('../models/Notification.js')).default;
        
        // Create notification for the client
        const notification = new Notification({
          recipient: dealer.clientId,
          sender: req.user.id,
          type: 'sales',
          title: 'New Sale Recorded',
          message: `${dealer.name} has recorded a new sale of ${req.body.amount.toFixed(2)}`,
          relatedId: sale._id,
          relatedModel: 'Sales',
          channels: ['app']
        });
        
        await notification.save({ session });
        
        // If client has WhatsApp notifications enabled, queue a WhatsApp message
        const client = await User.findById(dealer.clientId).select('notificationPreferences phone').session(session);
        if (client && client.notificationPreferences?.whatsapp && client.phone) {
          // This would be handled by a queue in production
          // For now, we'll just log it
          console.log(`WhatsApp notification queued for client ${client._id} about sale ${sale._id}`);
        }
      } catch (notificationError) {
        console.error('Error creating sale notification:', notificationError);
        // Continue with transaction even if notification creation fails
      }
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(201).json(sale);
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      
      console.error('Record sale error:', error);
      res.status(500).json({ 
        message: 'Failed to record sale', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
);

// Get sales statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Build query based on user role
    let query = { status: 'completed' };
    if (req.user.role === 'dealer') {
      query.userId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    // Calculate date ranges for current and previous periods
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);
    
    const previousPeriodStart = new Date(thirtyDaysAgo);
    previousPeriodStart.setDate(thirtyDaysAgo.getDate() - 30);

    // Current period stats
    const currentStats = await Sales.aggregate([
      { $match: { ...query, date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$amount' },
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Previous period stats for growth calculation
    const previousStats = await Sales.aggregate([
      { $match: { ...query, date: { $gte: previousPeriodStart, $lt: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$amount' },
          totalPoints: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Default values if no stats found
    const current = currentStats[0] || { totalSales: 0, totalPoints: 0, count: 0 };
    const previous = previousStats[0] || { totalSales: 0, totalPoints: 0, count: 0 };

    // Calculate growth percentages safely
    const salesGrowth = previous.totalSales === 0 ? 0 :
      ((current.totalSales - previous.totalSales) / previous.totalSales) * 100;

    const pointsGrowth = previous.totalPoints === 0 ? 0 :
      ((current.totalPoints - previous.totalPoints) / previous.totalPoints) * 100;

    // Get active contests count with error handling
    let activeContests = 0;
    try {
      activeContests = await Contest.countDocuments({ 
        status: 'active',
        ...(req.user.role === 'client' ? { clientId: req.user.id } : {}),
        ...(req.user.role === 'dealer' ? { clientId: req.user.clientId } : {})
      });
    } catch (contestError) {
      console.error('Error fetching active contests:', contestError);
      // Continue execution even if contest count fails
    }

    // Get pending rewards count from the Reward model's redemptions
    let pendingRewards = 0;
    try {
      // Import Reward model if not already imported
      const Reward = mongoose.models.Reward || (await import('../models/Reward.js')).default;
      
      // Query for pending reward redemptions
      const pendingRedemptionsQuery = {
        'redemptions.userId': req.user.role === 'dealer' ? req.user.id : null,
        'redemptions.status': 'pending'
      };
      
      // For clients, we need to count all their dealers' pending redemptions
      if (req.user.role === 'client') {
        delete pendingRedemptionsQuery['redemptions.userId'];
        pendingRedemptionsQuery.clientId = req.user.id;
      }
      
      // Use aggregation to count pending redemptions
      const pendingRedemptionsResult = await Reward.aggregate([
        { $match: pendingRedemptionsQuery },
        { $unwind: '$redemptions' },
        { $match: { 'redemptions.status': 'pending' } },
        ...(req.user.role === 'dealer' ? [{ $match: { 'redemptions.userId': mongoose.Types.ObjectId(req.user.id) } }] : []),
        { $count: 'total' }
      ]);
      
      pendingRewards = pendingRedemptionsResult.length > 0 ? pendingRedemptionsResult[0].total : 0;
    } catch (rewardsError) {
      console.error('Error fetching pending rewards:', rewardsError);
      // Continue execution even if rewards count fails
    }

    res.json({
      totalSales: current.totalSales,
      totalPoints: current.totalPoints,
      salesCount: current.count,
      activeContests,
      pendingRewards,
      salesGrowth: Number(salesGrowth.toFixed(1)),
      pointsGrowth: Number(pointsGrowth.toFixed(1))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve sales statistics', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get sale by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Check if user has access to this sale based on role
    if (req.user.role === 'dealer' && sale.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'client' && sale.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Populate user information
    await sale.populate('userId', 'name email');
    
    res.json(sale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve sale information', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Update sale status
router.patch('/:id/status', authMiddleware, authorize(['super_admin', 'client']), async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    
    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const sale = await Sales.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Check if client is updating their own sale
    if (req.user.role === 'client' && sale.clientId.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Access denied' });
    }

    // Store previous status and points for potential adjustments
    const previousStatus = sale.status;
    const previousPoints = sale.points;

    // Update sale status
    sale.status = status;
    sale.updatedAt = new Date();

    // If cancelling a previously completed sale, adjust user points
    if (previousStatus === 'completed' && status === 'cancelled' && previousPoints > 0) {
      // Find the dealer to adjust points
      const dealer = await User.findById(sale.userId).session(session);
      if (dealer) {
        // Only deduct if they have enough points
        if (dealer.points >= previousPoints) {
          dealer.points -= previousPoints;
          
          // Add to points history
          dealer.pointsHistory.push({
            amount: -previousPoints,
            type: 'adjusted',
            source: 'sales',
            sourceId: sale._id,
            description: `Points adjusted due to cancelled sale: ${sale._id}`
          });
          
          await dealer.save({ session });
        }
      }
    }

    await sale.save({ session });
    
    // Create notification for status change
    try {
      // Import Notification model if not already imported
      const Notification = mongoose.models.Notification || (await import('../models/Notification.js')).default;
      
      // Determine notification recipient (the dealer who made the sale)
      const notificationRecipient = sale.userId;
      
      // Create notification with appropriate message based on status
      let notificationTitle, notificationMessage;
      
      if (status === 'completed' && previousStatus !== 'completed') {
        notificationTitle = 'Sale Approved';
        notificationMessage = `Your sale of ${sale.amount.toFixed(2)} has been approved.`;
      } else if (status === 'cancelled' && previousStatus !== 'cancelled') {
        notificationTitle = 'Sale Cancelled';
        notificationMessage = `Your sale of ${sale.amount.toFixed(2)} has been cancelled.`;
      } else {
        notificationTitle = 'Sale Status Updated';
        notificationMessage = `Your sale of ${sale.amount.toFixed(2)} status has been updated to ${status}.`;
      }
      
      const notification = new Notification({
        recipient: notificationRecipient,
        sender: req.user.id,
        type: 'sales',
        title: notificationTitle,
        message: notificationMessage,
        relatedId: sale._id,
        relatedModel: 'Sales',
        channels: ['app']
      });
      
      await notification.save({ session });
      
      // If dealer has WhatsApp notifications enabled, queue a WhatsApp message
      const dealer = await User.findById(notificationRecipient).select('notificationPreferences phone name').session(session);
      if (dealer && dealer.notificationPreferences?.whatsapp && dealer.phone) {
        // This would be handled by a queue in production
        // For now, we'll just log it
        console.log(`WhatsApp notification queued for dealer ${dealer._id} about sale status change to ${status}`);
      }
    } catch (notificationError) {
      console.error('Error creating sale status notification:', notificationError);
      // Continue with transaction even if notification creation fails
    }
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Sale status updated successfully', sale });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update sale status error:', error);
    res.status(500).json({ 
      message: 'Failed to update sale status', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Handle undefined routes within sales endpoint
router.use((req, res) => {
  res.status(404).json({ message: 'Sales endpoint not found' });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Sales route error:', error);
  
  // Determine appropriate status code
  let statusCode = 500;
  if (error.name === 'ValidationError') statusCode = 400;
  if (error.name === 'CastError') statusCode = 400;
  if (error.name === 'MongoError' && error.code === 11000) statusCode = 409; // Duplicate key
  
  // Send appropriate error response
  res.status(statusCode).json({
    message: error.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

export default router;
