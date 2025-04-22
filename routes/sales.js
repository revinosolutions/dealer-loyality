import express from 'express';
import { body, validationResult } from 'express-validator';
import Sales from '../models/Sales.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateSale = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('type').notEmpty().withMessage('Sale type is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
];

// Get sales data (daily, weekly, monthly)
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();
    let startDate;

    // Set date range based on period
    switch (period) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default: // daily
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    // Build query based on user role
    let query = {
      date: { $gte: startDate },
      status: 'completed'
    };

    if (req.user.role === 'dealer') {
      query.userId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    const sales = await Sales.find(query).sort('date');

    // Process and format data based on period
    const formattedData = sales.reduce((acc, sale) => {
      const date = new Date(sale.date);
      let key;

      switch (period) {
        case 'weekly':
          key = `Week ${Math.ceil(date.getDate() / 7)}`;
          break;
        case 'monthly':
          key = date.toLocaleString('default', { month: 'short' });
          break;
        default: // daily
          key = date.toLocaleString('default', { weekday: 'short' });
      }

      if (!acc[key]) {
        acc[key] = { value: 0 };
      }
      acc[key].value += sale.amount;
      return acc;
    }, {});

    res.json(Object.entries(formattedData).map(([key, data]) => ({
      [period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day']: key,
      value: data.value
    })));
  } catch (error) {
    console.error('Get sales data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    let query = { role: 'dealer' };
    if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    const leaders = await User.find(query)
      .select('name points')
      .sort('-points')
      .limit(10);

    const formattedLeaders = leaders.map((leader, index) => ({
      id: leader._id,
      name: leader.name,
      points: leader.points,
      rank: index + 1,
      change: 0 // This could be calculated by comparing with previous rankings
    }));

    res.json(formattedLeaders);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Record new sale
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['dealer']),
  validateSale,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const sale = new Sales({
        ...req.body,
        userId: req.user.id,
        clientId: req.user.clientId,
        userRole: req.user.role,
        points: Math.floor(req.body.amount * 0.1) // Example points calculation
      });

      await sale.save();

      // Update user points
      await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { points: sale.points } }
      );

      res.status(201).json(sale);
    } catch (error) {
      console.error('Record sale error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get sales statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let query = { status: 'completed' };
    if (req.user.role === 'dealer') {
      query.userId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const previousThirtyDays = new Date(thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30));

    // Current period stats
    const currentStats = await Sales.aggregate([
      { $match: { ...query, date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$amount' },
          totalPoints: { $sum: '$points' }
        }
      }
    ]);

    // Previous period stats for growth calculation
    const previousStats = await Sales.aggregate([
      { $match: { ...query, date: { $gte: previousThirtyDays, $lt: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$amount' },
          totalPoints: { $sum: '$points' }
        }
      }
    ]);

    const current = currentStats[0] || { totalSales: 0, totalPoints: 0 };
    const previous = previousStats[0] || { totalSales: 0, totalPoints: 0 };

    // Calculate growth percentages
    const salesGrowth = previous.totalSales === 0 ? 0 :
      ((current.totalSales - previous.totalSales) / previous.totalSales) * 100;

    const pointsGrowth = previous.totalPoints === 0 ? 0 :
      ((current.totalPoints - previous.totalPoints) / previous.totalPoints) * 100;

    // Get active contests count
    const activeContests = await Contest.countDocuments({ status: 'active' });

    // Get pending rewards (could be implemented based on your reward system)
    const pendingRewards = 0; // Placeholder

    res.json({
      totalSales: current.totalSales,
      totalPoints: current.totalPoints,
      activeContests,
      pendingRewards,
      salesGrowth: Number(salesGrowth.toFixed(1)),
      pointsGrowth: Number(pointsGrowth.toFixed(1))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined routes within sales endpoint
router.use((req, res) => {
  res.status(404).json({ message: 'Sales endpoint not found' });
});

export default router;