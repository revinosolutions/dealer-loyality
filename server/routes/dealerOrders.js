import express from 'express';
import mongoose from 'mongoose';
import { check, validationResult } from 'express-validator';
import { authMiddleware, dealerMiddleware, clientMiddleware, sameOrganizationMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const Order = mongoose.model('Order');
const DealerSlot = mongoose.model('DealerSlot');
const ClientOrder = mongoose.model('ClientOrder');
const User = mongoose.model('User');
const Product = mongoose.model('Product');

// @route    GET /api/dealer-orders
// @desc     Get all dealer orders
// @access   Private + Dealer/Client
router.get('/', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const { status, sort = 'newest', limit = 20, page = 1 } = req.query;
    
    // Build query based on user role
    const query = {};
    
    // Dealers can only see their own orders
    if (req.user.role === 'dealer') {
      query.dealerId = req.user.id;
    } 
    // Clients can see orders for slots they own
    else if (req.user.role === 'client') {
      // First get all dealer slots owned by this client
      const clientSlots = await DealerSlot.find({ clientId: req.user.id });
      const slotIds = clientSlots.map(slot => slot._id);
      
      // Then find orders that include these slots
      query['items.slotId'] = { $in: slotIds };
    }
    // Others not allowed
    else if (!['admin', 'superadmin'].includes(req.user.role)) {
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
    const dealerOrders = await Order.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('dealerId', 'name email')
      .populate('clientId', 'name email')
      .populate({
        path: 'items.slotId',
        select: 'name dealerPrice loyaltyPoints originalProduct',
        populate: {
          path: 'originalProduct',
          select: 'name sku category'
        }
      });
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    res.json({
      dealerOrders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get dealer orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/dealer-orders/:id
// @desc     Get dealer order by ID
// @access   Private + Dealer/Client
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const dealerOrder = await Order.findById(orderId)
      .populate('dealerId', 'name email')
      .populate('clientId', 'name email')
      .populate({
        path: 'items.slotId',
        select: 'name dealerPrice loyaltyPoints originalProduct redemptionRules',
        populate: {
          path: 'originalProduct',
          select: 'name sku category specifications images'
        }
      });
    
    if (!dealerOrder) {
      return res.status(404).json({ message: 'Dealer order not found' });
    }
    
    // Check if user has access to this order
    if (req.user.role === 'dealer' && dealerOrder.dealerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'client') {
      // Check if client owns any of the slots in this order
      const slotIds = dealerOrder.items.map(item => item.slotId._id.toString());
      const clientSlots = await DealerSlot.find({ 
        clientId: req.user.id,
        _id: { $in: slotIds }
      });
      
      if (clientSlots.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(dealerOrder);
  } catch (err) {
    console.error('Get dealer order error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dealer order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/dealer-orders
// @desc     Create a new dealer order
// @access   Private + Dealer
router.post('/', [
  authMiddleware, 
  dealerMiddleware,
  sameOrganizationMiddleware,
  check('items', 'Items are required').isArray({ min: 1 }),
  check('items.*.slotId', 'Slot ID is required for each item').isMongoId(),
  check('items.*.quantity', 'Quantity must be a positive number').isInt({ min: 1 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items, shippingAddress, billingAddress, paymentMethod, notes } = req.body;

  try {
    // Process order items
    const processedItems = [];
    let invalidItems = [];
    let unavailableItems = [];
    let total = 0;
    let pointsEarned = 0;
    
    // Track which slots are being ordered by client
    const slotsByClient = {};

    // Validate all slots and calculate totals
    for (const item of items) {
      // Find slot and verify it exists and is available
      const slot = await DealerSlot.findById(item.slotId)
        .populate('clientId', 'id name')
        .populate('originalProduct', 'name');
      
      if (!slot) {
        invalidItems.push(item.slotId);
        continue;
      }
      
      // Check if slot is in the same organization
      if (slot.organizationId.toString() !== req.user.organizationId.toString()) {
        invalidItems.push(item.slotId);
        continue;
      }
      
      // Check if slot is active
      if (slot.status !== 'active') {
        unavailableItems.push({
          slotId: item.slotId,
          name: slot.name,
          reason: 'Slot is not active'
        });
        continue;
      }
      
      // Check if slot has expired
      if (slot.expiryDate && new Date(slot.expiryDate) < new Date()) {
        unavailableItems.push({
          slotId: item.slotId,
          name: slot.name,
          reason: 'Slot has expired'
        });
        continue;
      }
      
      // Check if slot has enough available quantity
      if (slot.availableQuantity < item.quantity) {
        unavailableItems.push({
          slotId: item.slotId,
          name: slot.name,
          requested: item.quantity,
          available: slot.availableQuantity,
          reason: 'Insufficient quantity'
        });
        continue;
      }
      
      // Check for any redemption requirements
      if (slot.redemptionRules && slot.redemptionRules.pointsRequired > 0) {
        // In a real system, would check dealer's loyalty points balance
        // For now, just add it to the response as a note
        const pointsNote = `This requires ${slot.redemptionRules.pointsRequired} loyalty points per unit.`;
        item.notes = item.notes ? `${item.notes} ${pointsNote}` : pointsNote;
      }
      
      // Calculate line total
      const lineTotal = slot.dealerPrice * item.quantity;
      
      // Calculate loyalty points earned
      const lineLoyaltyPoints = slot.loyaltyPoints * item.quantity;
      
      // Group slots by client for processing
      const clientId = slot.clientId._id.toString();
      if (!slotsByClient[clientId]) {
        slotsByClient[clientId] = {
          clientId: clientId,
          clientName: slot.clientId.name,
          items: []
        };
      }
      
      slotsByClient[clientId].items.push({
        slotId: slot._id,
        quantity: item.quantity
      });
      
      // Add to processed items
      processedItems.push({
        slotId: slot._id,
        productName: slot.originalProduct.name,
        slotName: slot.name,
        quantity: item.quantity,
        price: slot.dealerPrice,
        lineTotal,
        pointsEarned: lineLoyaltyPoints,
        redemptionRules: slot.redemptionRules,
        notes: item.notes
      });
      
      // Add to order totals
      total += lineTotal;
      pointsEarned += lineLoyaltyPoints;
    }
    
    // Check if there were any invalid slots
    if (invalidItems.length > 0) {
      return res.status(400).json({ 
        message: 'Some slots are invalid or not available',
        invalidItems 
      });
    }
    
    // Check if there were any unavailable slots
    if (unavailableItems.length > 0) {
      return res.status(400).json({ 
        message: 'Some slots are unavailable',
        unavailableItems 
      });
    }
    
    // Generate order number
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    const orderNumber = `DO-${timestamp}-${random}`;
    
    // Create new dealer order
    const dealerOrder = new Order({
      orderNumber,
      clientId: processedItems[0].slotId.clientId, // Just use the first slot's client for now
      dealerId: req.user.id,
      items: processedItems,
      total,
      pointsEarned,
      status: 'pending',
      orderDate: new Date(),
      shippingAddress,
      billingAddress,
      paymentMethod: paymentMethod || 'credit_card',
      paymentStatus: 'pending',
      notes
    });
    
    // Create status history entry
    dealerOrder.statusHistory.push({
      status: 'pending',
      date: new Date(),
      updatedBy: req.user.id
    });
    
    // Save order
    const savedOrder = await dealerOrder.save();
    
    // Update available quantities for each slot and update client order allocations
    for (const item of items) {
      const slot = await DealerSlot.findById(item.slotId);
      
      // Decrease available quantity
      slot.availableQuantity -= item.quantity;
      await slot.save();
      
      // Find client orders that contain this product
      const clientOrders = await ClientOrder.find({
        clientId: slot.clientId,
        'items.productId': slot.originalProduct,
        status: { $in: ['approved', 'completed'] }
      });
      
      // Update allocated quantities in client orders
      let remainingToAllocate = item.quantity;
      for (const order of clientOrders) {
        if (remainingToAllocate <= 0) break;
        
        for (const orderItem of order.items) {
          if (orderItem.productId.toString() === slot.originalProduct.toString()) {
            const availableToAllocate = orderItem.quantity - orderItem.allocatedQuantity;
            
            if (availableToAllocate > 0) {
              const allocateAmount = Math.min(availableToAllocate, remainingToAllocate);
              orderItem.allocatedQuantity += allocateAmount;
              remainingToAllocate -= allocateAmount;
              
              if (remainingToAllocate <= 0) break;
            }
          }
        }
        
        await order.save();
      }
    }
    
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Create dealer order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/dealer-orders/:id/status
// @desc     Update dealer order status
// @access   Private + Client (slot owner)
router.put('/:id/status', [
  authMiddleware,
  clientMiddleware,
  sameOrganizationMiddleware,
  check('status', 'Status is required').isIn(['processing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const orderId = req.params.id;
    const { status, trackingNumber, notes } = req.body;
    
    // Find order
    const dealerOrder = await Order.findById(orderId).populate('items.slotId');
    
    if (!dealerOrder) {
      return res.status(404).json({ message: 'Dealer order not found' });
    }
    
    // Verify client has access to this order (owns at least one slot)
    const slotIds = dealerOrder.items.map(item => 
      item.slotId && item.slotId._id ? item.slotId._id.toString() : null
    ).filter(id => id !== null);
    
    const clientSlots = await DealerSlot.find({ 
      clientId: req.user.id,
      _id: { $in: slotIds }
    });
    
    if (clientSlots.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check for valid status transitions
    const validTransitions = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };
    
    if (!validTransitions[dealerOrder.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${dealerOrder.status} to ${status}`
      });
    }
    
    // If cancelling the order, return products to available quantity
    if (status === 'cancelled' && dealerOrder.status !== 'cancelled') {
      for (const item of dealerOrder.items) {
        if (item.slotId) {
          await DealerSlot.findByIdAndUpdate(
            item.slotId._id,
            { $inc: { availableQuantity: item.quantity } }
          );
          
          // Also update allocated quantities in client orders
          // Find client orders that contain this product
          const slot = await DealerSlot.findById(item.slotId._id);
          
          const clientOrders = await ClientOrder.find({
            clientId: req.user.id,
            'items.productId': slot.originalProduct,
            status: { $in: ['approved', 'completed'] }
          });
          
          // Update allocated quantities in client orders (decrease)
          let remainingToUnallocate = item.quantity;
          for (const order of clientOrders) {
            if (remainingToUnallocate <= 0) break;
            
            for (const orderItem of order.items) {
              if (orderItem.productId.toString() === slot.originalProduct.toString()) {
                if (orderItem.allocatedQuantity > 0) {
                  const unallocateAmount = Math.min(orderItem.allocatedQuantity, remainingToUnallocate);
                  orderItem.allocatedQuantity -= unallocateAmount;
                  remainingToUnallocate -= unallocateAmount;
                  
                  if (remainingToUnallocate <= 0) break;
                }
              }
            }
            
            await order.save();
          }
        }
      }
    }
    
    // Update order status
    dealerOrder.status = status;
    dealerOrder.lastModifiedBy = req.user.id;
    
    // Add tracking number if provided
    if (trackingNumber) {
      dealerOrder.trackingNumber = trackingNumber;
    }
    
    // Add notes if provided
    if (notes) {
      dealerOrder.notes = notes;
    }
    
    // Add to status history
    dealerOrder.statusHistory.push({
      status,
      date: new Date(),
      updatedBy: req.user.id,
      notes
    });
    
    // If status is delivered, set actual delivery date
    if (status === 'delivered') {
      dealerOrder.actualDeliveryDate = new Date();
    }
    
    await dealerOrder.save();
    
    res.json(dealerOrder);
  } catch (err) {
    console.error('Update dealer order status error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dealer order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 