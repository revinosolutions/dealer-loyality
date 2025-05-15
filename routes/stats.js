import express from 'express';
import Sales from '../models/Sales.js';
import Contest from '../models/Contest.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Organization from '../models/Organization.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Build query based on user role
    let salesQuery = {};
    let contestQuery = {};
    let userQuery = {};
    
    if (req.user.role === 'dealer') {
      salesQuery.userId = req.user.id;
      contestQuery.clientId = req.user.clientId;
      userQuery._id = req.user.id;
    } else if (req.user.role === 'client') {
      salesQuery.clientId = req.user.id;
      contestQuery.clientId = req.user.id;
      userQuery.clientId = req.user.id;
    }

    // Get current date and date from 30 days ago for growth calculations
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(currentDate.getDate() - 60);

    // Get total sales amount
    const totalSales = await Sales.aggregate([
      { $match: { ...salesQuery, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get total points
    const totalPoints = await User.aggregate([
      { $match: userQuery },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    // Get active contests count
    const activeContests = await Contest.countDocuments({
      ...contestQuery,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    // Get pending rewards (simplified as contests with progress > 0 but < 100)
    const pendingRewards = await Contest.countDocuments({
      ...contestQuery,
      progress: { $gt: 0, $lt: 100 },
      status: 'active'
    });

    // Calculate sales growth (last 30 days vs previous 30 days)
    const currentPeriodSales = await Sales.aggregate([
      { 
        $match: { 
          ...salesQuery, 
          status: 'completed',
          date: { $gte: thirtyDaysAgo, $lte: currentDate } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const previousPeriodSales = await Sales.aggregate([
      { 
        $match: { 
          ...salesQuery, 
          status: 'completed',
          date: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calculate points growth
    const currentPoints = totalPoints.length > 0 ? totalPoints[0].total : 0;
    const previousPoints = currentPoints * 0.9; // Simplified calculation for demo

    // Calculate growth percentages
    const currentSalesTotal = currentPeriodSales.length > 0 ? currentPeriodSales[0].total : 0;
    const previousSalesTotal = previousPeriodSales.length > 0 ? previousPeriodSales[0].total : 0;
    
    let salesGrowth = 0;
    if (previousSalesTotal > 0) {
      salesGrowth = ((currentSalesTotal - previousSalesTotal) / previousSalesTotal) * 100;
    }

    let pointsGrowth = 0;
    if (previousPoints > 0) {
      pointsGrowth = ((currentPoints - previousPoints) / previousPoints) * 100;
    }

    // Prepare response
    const stats = {
      totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      totalPoints: currentPoints,
      activeContests,
      pendingRewards,
      salesGrowth: parseFloat(salesGrowth.toFixed(1)),
      pointsGrowth: parseFloat(pointsGrowth.toFixed(1))
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get leaderboard data
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'client') {
      query.clientId = req.user.id;
      query.role = 'dealer';
    } else if (req.user.role === 'dealer') {
      query.clientId = req.user.clientId;
      query.role = 'dealer';
    } else {
      // For super_admin, get all dealers
      query.role = 'dealer';
    }

    // Get top dealers by points
    const leaders = await User.find(query)
      .sort({ points: -1 })
      .limit(10)
      .select('_id name points');

    // Format response with rank
    const formattedLeaders = leaders.map((leader, index) => ({
      id: leader._id,
      name: leader.name,
      points: leader.points,
      rank: index + 1,
      // Random change for demo purposes
      change: Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
    }));

    res.json(formattedLeaders);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get organization statistics
router.get('/organization/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check user authorization
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only endpoint.' });
    }
    
    // If admin, validate they are from this organization
    if (req.user.role === 'admin' && req.user.organization?._id?.toString() !== id) {
      return res.status(403).json({ message: 'Access denied. You can only view your own organization.' });
    }
    
    // Get organization details
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Get user counts for this organization
    const [adminCount, clientCount, dealerCount] = await Promise.all([
      User.countDocuments({ role: 'admin', 'organization._id': id }),
      User.countDocuments({ role: 'client', 'organization._id': id }),
      User.countDocuments({ role: 'dealer', 'organization._id': id })
    ]);
    
    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [activeClientCount, activeDealerCount] = await Promise.all([
      User.countDocuments({ 
        role: 'client', 
        'organization._id': id,
        lastLogin: { $gte: thirtyDaysAgo }
      }),
      User.countDocuments({ 
        role: 'dealer', 
        'organization._id': id,
        lastLogin: { $gte: thirtyDaysAgo }
      })
    ]);
    
    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { 'organization._id': id } },
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 },
        total: { $sum: '$total' }
      }}
    ]);
    
    const orderTotals = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      canceled: 0,
      total: 0,
      value: 0
    };
    
    orderStats.forEach(stat => {
      if (orderTotals.hasOwnProperty(stat._id)) {
        orderTotals[stat._id] = stat.count;
        orderTotals.value += stat.total;
      }
      orderTotals.total += stat.count;
    });
    
    // Get sales data for past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlySales = await Sales.aggregate([
      { 
        $match: { 
          'organization._id': id,
          date: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$date' }, 
            month: { $month: '$date' } 
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format monthly sales data
    const salesByMonth = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const existing = monthlySales.find(s => 
        s._id.year === year && s._id.month === month
      );
      
      salesByMonth.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year,
        total: existing ? existing.total : 0,
        count: existing ? existing.count : 0
      });
    }
    
    // Return organization statistics
    res.json({
      organization: {
        name: organization.name,
        status: organization.status,
        description: organization.description,
        createdAt: organization.createdAt
      },
      userCounts: {
        admin: adminCount,
        client: clientCount,
        dealer: dealerCount,
        activeClients: activeClientCount,
        activeDealers: activeDealerCount
      },
      orders: orderTotals,
      salesByMonth
    });
  } catch (error) {
    console.error('Organization stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined stats routes
router.use((req, res) => {
  res.status(404).json({ message: 'Stats endpoint not found' });
});

export default router;
