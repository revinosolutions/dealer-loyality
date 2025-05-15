import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get orders with filtering options
 * @access  Private
 */
router.get('/', authMiddleware, authorize(['admin', 'client', 'dealer']), async (req, res) => {
  try {
    const {
      status,
      startDate,
      endDate,
      limit = 20,
      page = 1
    } = req.query;
    
    // Build query based on user role
    const query = {};
    
    // Filter by role - users can only see orders they're involved in
    if (req.user.role === 'super_admin') {
      // Admin can see all orders or filter by seller (manufacturer)
      if (req.query.sellerId) {
        query.sellerId = req.query.sellerId;
      }
      if (req.query.buyerId) {
        query.buyerId = req.query.buyerId;
      }
    } else if (req.user.role === 'client') {
      // Clients can see orders where they are buyer or seller
      query.$or = [
        { buyerId: req.user.id },
        { sellerId: req.user.id }
      ];
    } else if (req.user.role === 'dealer') {
      // Dealers can only see orders where they are buyer
      query.buyerId = req.user.id;
    }
    
    // Additional filters
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.orderDate = {};
      
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.orderDate.$lte = new Date(endDate);
      }
    }
    
    // Handle pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query with pagination
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('buyerId', 'name email company')
      .populate('sellerId', 'name email company')
      .populate('items.productId', 'name sku images');
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, authorize(['admin', 'client', 'dealer']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'name email company phone location')
      .populate('sellerId', 'name email company phone location')
      .populate('items.productId')
      .populate('history.performedBy', 'name email role');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user has permission to view this order
    if (req.user.role !== 'super_admin' && 
        order.buyerId._id.toString() !== req.user.id && 
        order.sellerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private - Client and Dealer
 */
router.post('/', authMiddleware, authorize(['admin', 'client', 'dealer']), async (req, res) => {
  try {
    const {
      sellerId,
      items,
      shippingDetails,
      paymentDetails,
      notes
    } = req.body;
    
    // Validate seller exists
    // In a real implementation, you would check if the seller is valid
    
    // Validate items and calculate totals
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    const orderItems = [];
    let subtotal = 0;
    
    // Process each item
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${item.productId} not found` });
      }
      
      if (product.inventory.currentStock < item.quantity) {
        return res.status(400).json({ 
          message: `Not enough stock for ${product.name}. Available: ${product.inventory.currentStock}` 
        });
      }
      
      // Determine price based on buyer role
      let unitPrice = product.pricing.manufacturerPrice;
      if (req.user.role === 'dealer') {
        unitPrice = product.pricing.suggestedClientPrice;
      }
      
      const totalPrice = unitPrice * item.quantity;
      
      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });
      
      subtotal += totalPrice;
      
      // Reserve the stock
      await product.reserveStock(item.quantity);
    }
    
    // Calculate tax, shipping, etc. (simplified for demo)
    const taxAmount = req.body.taxAmount || 0;
    const shippingAmount = req.body.shippingAmount || 0;
    const discountAmount = req.body.discountAmount || 0;
    
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;
    
    // Create order
    const order = new Order({
      buyerId: req.user.id,
      sellerId,
      items: orderItems,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      shippingDetails,
      paymentDetails,
      notes,
      history: [{
        status: 'pending',
        performedBy: req.user.id,
        notes: 'Order created'
      }]
    });
    
    await order.save();
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private
 */
router.patch('/:id/status', authMiddleware, authorize(['admin', 'client', 'dealer']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check permissions based on the status change
    let hasPermission = false;
    
    if (req.user.role === 'super_admin') {
      // Admin can change any status
      hasPermission = true;
    } else if (req.user.role === 'client') {
      // Client can approve/reject/process/ship orders they sell
      if (order.sellerId.toString() === req.user.id) {
        if (['approved', 'processing', 'shipped', 'rejected'].includes(status)) {
          hasPermission = true;
        }
      }
      // Client can cancel their own orders as buyer
      if (order.buyerId.toString() === req.user.id && status === 'cancelled') {
        hasPermission = true;
      }
    } else if (req.user.role === 'dealer') {
      // Dealer can only cancel their own orders
      if (order.buyerId.toString() === req.user.id && status === 'cancelled') {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Not authorized to update this order status' });
    }
    
    // Handle inventory changes based on status
    if (status === 'approved' && order.status === 'pending') {
      // No inventory changes on approval
    } else if (status === 'shipped' && ['approved', 'processing'].includes(order.status)) {
      // Reduce inventory when order is shipped
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          await product.fulfillOrder(item.quantity);
          
          // Record inventory movement
          await Inventory.recordMovement({
            productId: item.productId,
            location: 'Warehouse', // This would be dynamic in a real app
            quantity: item.quantity,
            movementType: 'out',
            referenceOrder: order._id,
            performedBy: req.user.id,
            notes: `Order ${order.orderNumber} shipped`
          });
        }
      }
    } else if (['cancelled', 'rejected'].includes(status) && !['delivered', 'cancelled', 'rejected'].includes(order.status)) {
      // Release reserved stock when order is cancelled or rejected
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          await product.releaseReservedStock(item.quantity);
        }
      }
    }
    
    // Update order status
    await order.addStatusHistory(status, req.user.id, notes);
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route   GET /api/orders/stats/summary
 * @desc    Get order statistics summary
 * @access  Private
 */
router.get('/stats/summary', authMiddleware, authorize(['admin', 'client', 'dealer']), async (req, res) => {
  try {
    const query = {};
    
    // Filter by role
    if (req.user.role === 'client') {
      query.$or = [
        { buyerId: req.user.id },
        { sellerId: req.user.id }
      ];
    } else if (req.user.role === 'dealer') {
      query.buyerId = req.user.id;
    }
    
    // Get counts by status
    const pendingCount = await Order.countDocuments({ ...query, status: 'pending' });
    const approvedCount = await Order.countDocuments({ ...query, status: 'approved' });
    const processingCount = await Order.countDocuments({ ...query, status: 'processing' });
    const shippedCount = await Order.countDocuments({ ...query, status: 'shipped' });
    const deliveredCount = await Order.countDocuments({ ...query, status: 'delivered' });
    const cancelledCount = await Order.countDocuments({ ...query, status: { $in: ['cancelled', 'rejected'] } });
    
    // Get total orders
    const totalOrders = await Order.countDocuments(query);
    
    // Get total value
    const totalValue = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    // Get recent order count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = await Order.countDocuments({
      ...query,
      orderDate: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      totalOrders,
      totalValue: totalValue.length > 0 ? totalValue[0].total : 0,
      recentOrders,
      byStatus: {
        pending: pendingCount,
        approved: approvedCount,
        processing: processingCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount
      }
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
