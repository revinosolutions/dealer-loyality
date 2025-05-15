import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware, restrictAdminCreatedClients, restrictClientCreatedDealers } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Sales = mongoose.model('Sales');
const User = mongoose.model('User');
const Product = mongoose.model('Product');

// Get all sales with filtering
router.get('/', [authMiddleware, restrictClientCreatedDealers], async (req, res) => {
  try {
    const { 
      dealerId, clientId, startDate, endDate, 
      sort, limit = 20, page = 1 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      query.dealerId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }
    
    // Additional filters
    if (dealerId && ['admin', 'superadmin', 'client'].includes(req.user.role)) {
      query.dealerId = dealerId;
    }
    
    if (clientId && ['admin', 'superadmin'].includes(req.user.role)) {
      query.clientId = clientId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { date: -1 }; // Default: newest first
    if (sort === 'amount-asc') sortOption = { amount: 1 };
    if (sort === 'amount-desc') sortOption = { amount: -1 };
    if (sort === 'date-asc') sortOption = { date: 1 };
    
    // Execute query
    const sales = await Sales.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('dealerId', 'name email')
      .populate('clientId', 'name email')
      .populate('products.productId', 'name sku price');
    
    // Get total count for pagination
    const total = await Sales.countDocuments(query);
    
    res.json({
      sales,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get sales error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const saleId = req.params.id;
    
    const sale = await Sales.findById(saleId)
      .populate('dealerId', 'name email phone')
      .populate('clientId', 'name email company')
      .populate('products.productId', 'name sku price images');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'dealer' && sale.dealerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'client' && sale.clientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(sale);
  } catch (err) {
    console.error('Get sale error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Record new sale
router.post('/', [
  authMiddleware,
  check('products', 'Products are required').isArray({ min: 1 }),
  check('products.*.productId', 'Product ID is required').not().isEmpty(),
  check('products.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('products.*.price', 'Price is required').isNumeric(),
  check('clientId', 'Client ID is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      products,
      clientId,
      customer,
      pointsAwarded,
      region,
      location,
      contestId
    } = req.body;
    
    // If dealer, verify they belong to the specified client
    if (req.user.role === 'dealer') {
      if (req.user.clientId.toString() !== clientId) {
        return res.status(403).json({ message: 'You can only record sales for your assigned client' });
      }
    }
    
    // Verify client exists
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(400).json({ message: 'Invalid client' });
    }
    
    // Calculate total amount and prepare products array
    let totalAmount = 0;
    const finalProducts = [];
    
    for (const item of products) {
      // Verify product exists
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      
      // Calculate line total
      const lineTotal = item.price * item.quantity;
      
      // Add to total amount
      totalAmount += lineTotal;
      
      // Add to final products array
      finalProducts.push({
        productId: product._id,
        quantity: item.quantity,
        price: item.price,
        lineTotal,
        category: product.category
      });
    }
    
    // Create sale
    const newSale = new Sales({
      dealerId: req.user.role === 'dealer' ? req.user.id : req.body.dealerId,
      clientId,
      products: finalProducts,
      amount: totalAmount,
      date: new Date(),
      customer,
      pointsAwarded: pointsAwarded || Math.floor(totalAmount * 0.01), // Default: 1 point per 100 currency
      region,
      location,
      contestId
    });
    
    await newSale.save();
    
    // If points awarded, update dealer's points
    if (newSale.pointsAwarded > 0 && newSale.dealerId) {
      const dealer = await User.findById(newSale.dealerId);
      if (dealer) {
        dealer.points += newSale.pointsAwarded;
        dealer.stats.totalSales += totalAmount;
        
        // Add to points history
        dealer.pointsHistory.push({
          amount: newSale.pointsAwarded,
          type: 'earned',
          source: 'sale',
          sourceId: newSale._id,
          description: `Sale: ${finalProducts.length} products for ${totalAmount}`,
          date: new Date()
        });
        
        await dealer.save();
      }
    }
    
    // Return the new sale with populated fields
    const savedSale = await Sales.findById(newSale._id)
      .populate('dealerId', 'name email')
      .populate('clientId', 'name email')
      .populate('products.productId', 'name sku');
    
    res.status(201).json(savedSale);
  } catch (err) {
    console.error('Create sale error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales summary/dashboard data
router.get('/summary/dashboard', authMiddleware, async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    // Build base query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      query.dealerId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }
    
    // Date range
    let start, end = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default time periods
      if (period === 'week') {
        start = new Date();
        start.setDate(start.getDate() - 7);
      } else if (period === 'month') {
        start = new Date();
        start.setMonth(start.getMonth() - 1);
      } else if (period === 'year') {
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
      } else {
        // Default to last 30 days
        start = new Date();
        start.setDate(start.getDate() - 30);
      }
    }
    
    query.date = { $gte: start, $lte: end };
    
    // Total sales
    const totalSales = await Sales.countDocuments(query);
    
    // Total revenue
    const revenueData = await Sales.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalRevenue = revenueData.length ? revenueData[0].total : 0;
    
    // Sales by category
    const categorySales = await Sales.aggregate([
      { $match: query },
      { $unwind: '$products' },
      { $group: { 
        _id: '$products.category',
        sales: { $sum: '$products.lineTotal' },
        count: { $sum: '$products.quantity' }
      }},
      { $sort: { sales: -1 } }
    ]);
    
    // Top selling products
    const topProducts = await Sales.aggregate([
      { $match: query },
      { $unwind: '$products' },
      { $group: { 
        _id: '$products.productId',
        sales: { $sum: '$products.lineTotal' },
        count: { $sum: '$products.quantity' }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
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
        name: details?.name || 'Unknown Product',
        sku: details?.sku || 'N/A',
        category: details?.category || 'N/A'
      };
    });
    
    // Sales over time
    const salesOverTime = await Sales.aggregate([
      { $match: query },
      { $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Format sales over time for charts
    const formattedSalesOverTime = salesOverTime.map(day => ({
      date: new Date(day._id.year, day._id.month - 1, day._id.day),
      count: day.count,
      amount: day.amount
    }));
    
    res.json({
      totalSales,
      totalRevenue,
      categorySales,
      topProducts: topProductsWithDetails,
      salesOverTime: formattedSalesOverTime,
      period: period || 'custom',
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Get sales summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 