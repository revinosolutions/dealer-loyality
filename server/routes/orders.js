import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware, restrictAdminCreatedClients, restrictClientCreatedDealers } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Order = mongoose.model('Order');
const Product = mongoose.model('Product');
const User = mongoose.model('User');
const Inventory = mongoose.model('Inventory');

// Get all orders (with filtering and role-based access)
router.get('/', [authMiddleware, restrictClientCreatedDealers], async (req, res) => {
  try {
    const { 
      status, from, to, 
      clientId, dealerId, search, 
      sort, limit, page 
    } = req.query;
    
    // Build query based on role and filters
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      // Dealers can only see their own orders
      query.dealerId = req.user.id;
    } else if (req.user.role === 'client') {
      // Clients can see orders from their dealers
      query.clientId = req.user.id;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by date range
    if (from || to) {
      query.orderDate = {};
      if (from) query.orderDate.$gte = new Date(from);
      if (to) query.orderDate.$lte = new Date(to);
    }
    
    // Filter by clientId (admin only)
    if (clientId && ['admin', 'superadmin'].includes(req.user.role)) {
      query.clientId = clientId;
    }
    
    // Filter by dealerId (admin or client)
    if (dealerId && ['admin', 'superadmin', 'client'].includes(req.user.role)) {
      query.dealerId = dealerId;
    }
    
    // Search by order number
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const currentPage = parseInt(page) || 1;
    const ordersPerPage = parseInt(limit) || 10;
    const skip = (currentPage - 1) * ordersPerPage;
    
    // Sorting
    let sortOption = { orderDate: -1 }; // Default: newest first
    if (sort) {
      if (sort === 'total-asc') sortOption = { total: 1 };
      if (sort === 'total-desc') sortOption = { total: -1 };
      if (sort === 'date-asc') sortOption = { orderDate: 1 };
      if (sort === 'date-desc') sortOption = { orderDate: -1 };
    }
    
    // Execute query with pagination and sorting
    const orders = await Order.find(query)
      .populate('clientId', 'name email')
      .populate('dealerId', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(ordersPerPage);
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    
    // Return orders with pagination info
    res.json({
      orders,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalOrders / ordersPerPage),
        totalOrders,
        ordersPerPage
      }
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await Order.findById(orderId)
      .populate('clientId', 'name email phone company')
      .populate('dealerId', 'name email phone company')
      .populate('items.productId', 'name price sku images');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'dealer' && order.dealerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'client' && order.clientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new order (dealer or admin)
router.post('/', [
  authMiddleware,
  check('items', 'Items are required').isArray({ min: 1 }),
  check('items.*.productId', 'Product ID is required').not().isEmpty(),
  check('items.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('clientId', 'Client ID is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    items, clientId, shippingAddress, 
    billingAddress, notes, paymentMethod
  } = req.body;

  try {
    // Dealers can only order from their assigned client
    if (req.user.role === 'dealer' && req.user.clientId && req.user.clientId.toString() !== clientId) {
      return res.status(403).json({ message: 'You can only order from your assigned client' });
    }
    
    // Check if client exists
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(400).json({ message: 'Invalid client' });
    }
    
    // Calculate order total and validate product inventory
    let orderTotal = 0;
    const finalItems = [];
    
    for (let item of items) {
      // Get product details
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      
      // Check inventory (optional)
      if (product.stock !== undefined && product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Not enough stock for ${product.name}. Available: ${product.stock}` 
        });
      }
      
      // Calculate line total
      const lineTotal = product.price * item.quantity;
      
      // Add to order total
      orderTotal += lineTotal;
      
      // Add to final items with price info
      finalItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        lineTotal
      });
    }
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create new order
    const newOrder = new Order({
      orderNumber,
      clientId,
      dealerId: req.user.role === 'dealer' ? req.user.id : req.body.dealerId || req.user.id,
      items: finalItems,
      total: orderTotal,
      status: 'pending',
      orderDate: new Date(),
      shippingAddress,
      billingAddress,
      notes,
      paymentMethod
    });
    
    await newOrder.save();
    
    // Update inventory (optional)
    for (let item of finalItems) {
      const product = await Product.findById(item.productId);
      if (product.stock !== undefined) {
        product.stock -= item.quantity;
        await product.save();
      }
    }
    
    // Return the new order
    const savedOrder = await Order.findById(newOrder._id)
      .populate('clientId', 'name email')
      .populate('dealerId', 'name email')
      .populate('items.productId', 'name sku');
    
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status
router.put('/:id/status', [
  authMiddleware,
  check('status', 'Status is required').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const orderId = req.params.id;
    const { status, notes } = req.body;
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Role-based access control for updating status
    if (req.user.role === 'dealer') {
      // Dealers can only update their own orders if they're pending
      if (order.dealerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Dealers can only cancel pending orders
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({ message: 'Dealers can only cancel pending orders' });
      }
    } else if (req.user.role === 'client') {
      // Clients can update orders for their dealers
      if (order.clientId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Clients can't change delivered or returned orders
      if (['delivered', 'returned'].includes(order.status)) {
        return res.status(400).json({ message: `Cannot change status of ${order.status} orders` });
      }
    }
    
    // Handle inventory updates based on status change
    if (status === 'cancelled' && order.status !== 'cancelled') {
      // Return items to inventory when cancelling an order
      for (let item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.stock !== undefined) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    } else if (order.status === 'cancelled' && status !== 'cancelled') {
      // Remove items from inventory when un-cancelling
      for (let item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.stock !== undefined) {
          product.stock -= item.quantity;
          if (product.stock < 0) product.stock = 0;
          await product.save();
        }
      }
    }
    
    // Update order status
    order.status = status;
    if (notes) order.notes = notes;
    
    // Add status history
    order.statusHistory.push({
      status,
      date: new Date(),
      updatedBy: req.user.id,
      notes
    });
    
    await order.save();
    
    // Return updated order
    const updatedOrder = await Order.findById(orderId)
      .populate('clientId', 'name email')
      .populate('dealerId', 'name email')
      .populate('items.productId', 'name sku')
      .populate('statusHistory.updatedBy', 'name role');
    
    res.json(updatedOrder);
  } catch (err) {
    console.error('Update order status error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order statistics/dashboard data
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    // Different stats based on user role
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      query.dealerId = req.user.id;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }
    
    // Total orders count
    const totalOrders = await Order.countDocuments(query);
    
    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Total revenue
    const totalRevenue = await Order.aggregate([
      { $match: { ...query, status: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Recent orders
    const recentOrders = await Order.find(query)
      .sort({ orderDate: -1 })
      .limit(5)
      .populate('clientId', 'name')
      .populate('dealerId', 'name');
    
    // Monthly orders and revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          orderDate: { $gte: sixMonthsAgo },
          status: { $nin: ['cancelled', 'returned'] }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Top products
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          status: { $nin: ['cancelled', 'returned'] }
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
      { $limit: 5 }
    ]);
    
    // Get product details for top products
    const productIds = topProducts.map(p => p._id);
    const productDetails = await Product.find({ _id: { $in: productIds } }, 'name sku');
    
    // Attach product details
    const topProductsWithDetails = topProducts.map(product => {
      const details = productDetails.find(p => p._id.toString() === product._id.toString());
      return {
        ...product,
        name: details ? details.name : 'Unknown Product',
        sku: details ? details.sku : 'N/A'
      };
    });
    
    res.json({
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      recentOrders,
      monthlyData,
      topProducts: topProductsWithDetails
    });
  } catch (err) {
    console.error('Get order stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 