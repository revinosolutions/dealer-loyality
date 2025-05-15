import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, superAdminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const Order = mongoose.model('Order');
const User = mongoose.model('User');
const Product = mongoose.model('Product');
const Contest = mongoose.model('Contest');
const Sale = mongoose.model('Sales');

// Get sales analytics
router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const { period, from, to, clientId, dealerId } = req.query;
    
    // Build query based on role and filters
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      query.dealerId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    } else if (clientId && ['admin', 'superadmin'].includes(req.user.role)) {
      query.clientId = clientId;
    }
    
    // Filter by dealerId (admin or client)
    if (dealerId && ['admin', 'superadmin', 'client'].includes(req.user.role)) {
      query.dealerId = dealerId;
    }
    
    // Filter by date range
    let startDate, endDate;
    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else {
      // Default time periods
      endDate = new Date();
      
      if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === 'year') {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        // Default to last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
    }
    
    if (startDate && endDate) {
      query.orderDate = { $gte: startDate, $lte: endDate };
    }
    
    // Only include completed orders
    query.status = { $in: ['shipped', 'delivered'] };
    
    // Get sales data
    const salesData = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            day: { $dayOfMonth: '$orderDate' }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' },
          itemCount: { $sum: { $size: '$items' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Format date for easier frontend consumption
    const formattedSalesData = salesData.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day),
      orderCount: item.orderCount,
      revenue: item.revenue,
      itemCount: item.itemCount
    }));
    
    // Get summary metrics
    const summary = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);
    
    // Get product category breakdown
    const categoryBreakdown = await Order.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSales: { $sum: '$items.lineTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);
    
    res.json({
      salesData: formattedSalesData,
      summary: summary.length > 0 ? summary[0] : { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
      categoryBreakdown,
      period: period || 'custom',
      dateRange: {
        from: startDate,
        to: endDate
      }
    });
  } catch (err) {
    console.error('Get sales analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user analytics
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // User growth over time
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format date for easier frontend consumption
    const formattedUserGrowth = userGrowth.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, 1),
      count: item.count
    }));
    
    // User distribution by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // User activity (last active)
    const now = new Date();
    const activeUsers = {
      lastDay: await User.countDocuments({
        'stats.lastActive': { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),
      lastWeek: await User.countDocuments({
        'stats.lastActive': { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }),
      lastMonth: await User.countDocuments({
        'stats.lastActive': { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      })
    };
    
    // Top dealers by sales
    const topDealers = await Order.aggregate([
      { $match: { status: { $in: ['shipped', 'delivered'] } } },
      {
        $group: {
          _id: '$dealerId',
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);
    
    // Get user details for top dealers
    const dealerIds = topDealers.map(d => d._id);
    const dealerDetails = await User.find(
      { _id: { $in: dealerIds } },
      'name email'
    );
    
    // Attach dealer details
    const topDealersWithDetails = topDealers.map(dealer => {
      const details = dealerDetails.find(d => d._id.toString() === dealer._id.toString());
      return {
        ...dealer,
        name: details ? details.name : 'Unknown Dealer',
        email: details ? details.email : 'N/A'
      };
    });
    
    res.json({
      userGrowth: formattedUserGrowth,
      usersByRole,
      activeUsers,
      topDealers: topDealersWithDetails,
      total: await User.countDocuments()
    });
  } catch (err) {
    console.error('Get user analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get platform analytics (superadmin only)
router.get('/platform', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    // System metrics
    const metrics = {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ 'stats.lastActive': { $gte: lastMonth } }),
        new: await User.countDocuments({ createdAt: { $gte: lastMonth } })
      },
      orders: {
        total: await Order.countDocuments(),
        thisMonth: await Order.countDocuments({ orderDate: { $gte: lastMonth } }),
        lastMonth: await Order.countDocuments({ 
          orderDate: { $gte: twoMonthsAgo, $lt: lastMonth }
        }),
        revenue: {
          total: (await Order.aggregate([
            { $match: { status: { $in: ['shipped', 'delivered'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]))[0]?.total || 0,
          thisMonth: (await Order.aggregate([
            { 
              $match: { 
                status: { $in: ['shipped', 'delivered'] },
                orderDate: { $gte: lastMonth }
              } 
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]))[0]?.total || 0
        }
      },
      contests: {
        total: await Contest.countDocuments(),
        active: await Contest.countDocuments({ status: 'active' }),
        completed: await Contest.countDocuments({ status: 'completed' })
      },
      products: {
        total: await Product.countDocuments(),
        active: await Product.countDocuments({ status: 'active' })
      }
    };
    
    // Engagement metrics
    const engagement = {
      contestParticipation: await User.aggregate([
        { $match: { role: 'dealer' } },
        {
          $group: {
            _id: null,
            avgContestsParticipated: { $avg: '$stats.contestsParticipated' }
          }
        }
      ]),
      pointsDistribution: await User.aggregate([
        {
          $group: {
            _id: '$role',
            totalPoints: { $sum: '$points' },
            avgPoints: { $avg: '$points' }
          }
        }
      ])
    };
    
    // Growth metrics
    const monthlyGrowth = {
      users: await User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      orders: await Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$orderDate' },
              month: { $month: '$orderDate' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    };
    
    res.json({
      metrics,
      engagement,
      monthlyGrowth: {
        users: monthlyGrowth.users.map(item => ({
          date: new Date(item._id.year, item._id.month - 1, 1),
          count: item.count
        })),
        orders: monthlyGrowth.orders.map(item => ({
          date: new Date(item._id.year, item._id.month - 1, 1),
          count: item.count,
          revenue: item.revenue
        }))
      }
    });
  } catch (err) {
    console.error('Get platform analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client-specific analytics
router.get('/clients/:id', authMiddleware, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Check if user has access to this client's data
    if (req.user.role === 'dealer' || 
        (req.user.role === 'client' && req.user.id !== clientId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if client exists
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Client's dealers
    const dealers = await User.find(
      { clientId, role: 'dealer', status: 'active' },
      'name email company stats points'
    );
    
    // Dealer sales performance
    const dealerIds = dealers.map(d => d._id);
    const dealerSales = await Order.aggregate([
      { 
        $match: { 
          dealerId: { $in: dealerIds },
          status: { $in: ['shipped', 'delivered'] }
        } 
      },
      {
        $group: {
          _id: '$dealerId',
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      }
    ]);
    
    // Attach sales data to dealers
    const dealersWithSales = dealers.map(dealer => {
      const salesData = dealerSales.find(s => s._id.toString() === dealer._id.toString());
      return {
        ...dealer.toObject(),
        sales: salesData ? {
          totalSales: salesData.totalSales,
          orderCount: salesData.orderCount
        } : { totalSales: 0, orderCount: 0 }
      };
    });
    
    // Client's revenue over time
    const revenueOverTime = await Order.aggregate([
      { 
        $match: { 
          clientId: mongoose.Types.ObjectId(clientId),
          status: { $in: ['shipped', 'delivered'] }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Format date for easier frontend consumption
    const formattedRevenue = revenueOverTime.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, 1),
      revenue: item.revenue,
      orderCount: item.orderCount
    }));
    
    // Top selling products for this client
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          clientId: mongoose.Types.ObjectId(clientId),
          status: { $in: ['shipped', 'delivered'] }
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    
    // Get product details
    const productIds = topProducts.map(p => p._id);
    const productDetails = await Product.find(
      { _id: { $in: productIds } },
      'name sku category'
    );
    
    // Attach product details
    const topProductsWithDetails = topProducts.map(product => {
      const details = productDetails.find(p => p._id.toString() === product._id.toString());
      return {
        ...product,
        name: details ? details.name : 'Unknown Product',
        sku: details ? details.sku : 'N/A',
        category: details ? details.category : 'N/A'
      };
    });
    
    res.json({
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        company: client.company,
        stats: client.stats
      },
      dealers: dealersWithSales,
      revenueOverTime: formattedRevenue,
      topProducts: topProductsWithDetails,
      summary: {
        totalDealers: dealers.length,
        totalRevenue: dealerSales.reduce((total, dealer) => total + dealer.totalSales, 0),
        totalOrders: dealerSales.reduce((total, dealer) => total + dealer.orderCount, 0)
      }
    });
  } catch (err) {
    console.error('Get client analytics error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 