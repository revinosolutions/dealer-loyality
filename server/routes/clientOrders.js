import express from 'express';
import mongoose from 'mongoose';
import { check, validationResult } from 'express-validator';
import { authMiddleware, clientMiddleware, adminMiddleware, sameOrganizationMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const ClientOrder = mongoose.model('ClientOrder');
const Product = mongoose.model('Product');
const User = mongoose.model('User');
const DealerSlot = mongoose.model('DealerSlot');

// @route    GET /api/client-orders
// @desc     Get all client orders
// @access   Private + Client/Admin
router.get('/', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const { status, sort = 'newest', limit = 20, page = 1 } = req.query;
    
    // Build query based on user role
    const query = {};
    
    // Clients can only see their own orders
    if (req.user.role === 'client') {
      query.clientId = req.user.id;
    } 
    // Admins can see all orders for their organization
    else if (['admin', 'superadmin'].includes(req.user.role)) {
      query.organizationId = req.user.organizationId;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'total-asc':
        sortOption = { total: 1 };
        break;
      case 'total-desc':
        sortOption = { total: -1 };
        break;
      // Default is 'newest', already set
    }
    
    // Execute query
    const clientOrders = await ClientOrder.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('clientId', 'name email')
      .populate('organizationId', 'name')
      .populate('items.productId', 'name sku category price');
    
    // Get total count for pagination
    const total = await ClientOrder.countDocuments(query);
    
    res.json({
      clientOrders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get client orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/client-orders/:id
// @desc     Get client order by ID
// @access   Private + Client/Admin
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const clientOrder = await ClientOrder.findById(orderId)
      .populate('clientId', 'name email')
      .populate('organizationId', 'name')
      .populate('items.productId', 'name sku category price loyaltyPoints images specifications');
    
    if (!clientOrder) {
      return res.status(404).json({ message: 'Client order not found' });
    }
    
    // Check if user has access to this order
    if (req.user.role === 'client' && clientOrder.clientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (['admin', 'superadmin'].includes(req.user.role) && 
        clientOrder.organizationId._id.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(clientOrder);
  } catch (err) {
    console.error('Get client order error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Client order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/client-orders
// @desc     Create a new client order
// @access   Private + Client
router.post('/', [
  authMiddleware, 
  clientMiddleware,
  sameOrganizationMiddleware,
  check('items', 'Items are required').isArray({ min: 1 }),
  check('items.*.productId', 'Product ID is required for each item').isMongoId(),
  check('items.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items, paymentMethod, notes } = req.body;

  try {
    // Process order items
    const processedItems = [];
    let invalidItems = [];
    let outOfStockItems = [];
    let total = 0;
    let totalLoyaltyPoints = 0;

    // Validate all products and calculate totals
    for (const item of items) {
      // Find product and verify it exists
      const product = await Product.findById(item.productId);
      
      if (!product) {
        invalidItems.push(item.productId);
        continue;
      }
      
      // Check if product is in the same organization
      if (product.organizationId.toString() !== req.user.organizationId.toString()) {
        invalidItems.push(item.productId);
        continue;
      }
      
      // Check if product is active
      if (product.status !== 'active') {
        invalidItems.push(item.productId);
        continue;
      }
      
      // Check stock
      if (!product.hasStock(item.quantity)) {
        outOfStockItems.push({
          productId: item.productId,
          name: product.name,
          requested: item.quantity,
          available: product.stock
        });
        continue;
      }
      
      // Check order quantity against min/max
      if (item.quantity < product.minOrderQuantity) {
        return res.status(400).json({ 
          message: `Minimum order quantity for ${product.name} is ${product.minOrderQuantity}`
        });
      }
      
      if (product.maxOrderQuantity && item.quantity > product.maxOrderQuantity) {
        return res.status(400).json({ 
          message: `Maximum order quantity for ${product.name} is ${product.maxOrderQuantity}`
        });
      }
      
      // Calculate loyalty points including any applicable deals
      let loyaltyPoints = product.loyaltyPoints;
      let dealId = null;
      
      // If the item specifies a deal, validate and apply it
      if (item.dealId) {
        const deal = product.deals.id(item.dealId);
        
        if (deal && deal.isActive && item.quantity >= deal.quantity) {
          // Apply deal loyalty points bonus
          loyaltyPoints = product.calculateLoyaltyPoints(1, item.dealId);
          dealId = item.dealId;
        }
      } else {
        // Auto-apply best deal if quantity qualifies
        const eligibleDeals = product.deals.filter(
          deal => deal.isActive && item.quantity >= deal.quantity
        ).sort((a, b) => b.bonusLoyaltyPoints - a.bonusLoyaltyPoints);
        
        if (eligibleDeals.length > 0) {
          const bestDeal = eligibleDeals[0];
          loyaltyPoints = product.calculateLoyaltyPoints(1, bestDeal._id);
          dealId = bestDeal._id;
        }
      }
      
      // Calculate line total
      const lineTotal = product.price * item.quantity;
      
      // Add to processed items
      processedItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
        loyaltyPoints,
        dealId,
        allocatedQuantity: 0,
        lineTotal
      });
      
      // Add to order totals
      total += lineTotal;
      totalLoyaltyPoints += loyaltyPoints * item.quantity;
    }
    
    // Check if there were any invalid products
    if (invalidItems.length > 0) {
      return res.status(400).json({ 
        message: 'Some products are invalid or not available',
        invalidItems 
      });
    }
    
    // Check if there were any out of stock items
    if (outOfStockItems.length > 0) {
      return res.status(400).json({ 
        message: 'Some products are out of stock or have insufficient quantity',
        outOfStockItems 
      });
    }
    
    // Create new client order
    const clientOrder = new ClientOrder({
      clientId: req.user.id,
      organizationId: req.user.organizationId,
      items: processedItems,
      total,
      totalLoyaltyPoints,
      status: 'pending',
      paymentMethod: paymentMethod || 'credit_card',
      notes
    });
    
    // Create status history entry
    clientOrder.statusHistory.push({
      status: 'pending',
      date: new Date(),
      updatedBy: req.user.id
    });
    
    // Save order
    const savedOrder = await clientOrder.save();
    
    // Reduce stock for each product
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }
    
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Create client order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/client-orders/:id/status
// @desc     Update client order status
// @access   Private + Admin
router.put('/:id/status', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware,
  check('status', 'Status is required').isIn(['pending', 'approved', 'processing', 'completed', 'cancelled'])
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
    const clientOrder = await ClientOrder.findById(orderId)
      .populate('items.productId');
    
    if (!clientOrder) {
      return res.status(404).json({ message: 'Client order not found' });
    }
    
    // Verify admin has access to this order (same organization)
    if (clientOrder.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check for valid status transitions
    const validTransitions = {
      pending: ['approved', 'cancelled'],
      approved: ['processing', 'cancelled'],
      processing: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };
    
    if (!validTransitions[clientOrder.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${clientOrder.status} to ${status}`
      });
    }
    
    // If cancelling the order, return products to stock
    if (status === 'cancelled' && clientOrder.status !== 'cancelled') {
      for (const item of clientOrder.items) {
        // Return only the unallocated quantity to stock
        const returnQuantity = item.quantity - item.allocatedQuantity;
        if (returnQuantity > 0) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: returnQuantity } }
          );
        }
      }
    }
    
    // Update order status
    clientOrder.status = status;
    clientOrder.lastModifiedBy = req.user.id;
    
    // Add notes if provided
    if (notes) {
      clientOrder.notes = notes;
    }
    
    // Add to status history
    clientOrder.statusHistory.push({
      status,
      date: new Date(),
      updatedBy: req.user.id,
      notes
    });
    
    await clientOrder.save();
    
    res.json(clientOrder);
  } catch (err) {
    console.error('Update client order status error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Client order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/client-orders/inventory/summary
// @desc     Get summary of client's purchased inventory
// @access   Private + Client
router.get('/inventory/summary', [
  authMiddleware,
  clientMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    // Find all completed/approved client orders for this client
    const clientOrders = await ClientOrder.find({
      clientId: req.user.id,
      status: { $in: ['approved', 'completed'] }
    }).populate('items.productId', 'name sku category');
    
    // Calculate inventory summary
    const inventorySummary = {};
    
    // Process each order
    for (const order of clientOrders) {
      for (const item of order.items) {
        const productId = item.productId._id.toString();
        
        if (!inventorySummary[productId]) {
          inventorySummary[productId] = {
            productId,
            name: item.productId.name,
            sku: item.productId.sku,
            category: item.productId.category,
            totalPurchased: 0,
            allocated: 0,
            available: 0
          };
        }
        
        inventorySummary[productId].totalPurchased += item.quantity;
        inventorySummary[productId].allocated += item.allocatedQuantity;
        inventorySummary[productId].available = 
          inventorySummary[productId].totalPurchased - inventorySummary[productId].allocated;
      }
    }
    
    res.json(Object.values(inventorySummary));
  } catch (err) {
    console.error('Get inventory summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 