import express from 'express';
import mongoose from 'mongoose';
import { check, validationResult } from 'express-validator';
import { authMiddleware, clientMiddleware, sameOrganizationMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const DealerSlot = mongoose.model('DealerSlot');
const ClientOrder = mongoose.model('ClientOrder');
const Product = mongoose.model('Product');
const User = mongoose.model('User');

// @route    GET /api/dealer-slots
// @desc     Get all dealer slots created by the client
// @access   Private + Client
router.get('/', [authMiddleware, clientMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const { status, search, sort = 'newest', limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = { clientId: req.user.id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    switch (sort) {
      case 'price-asc':
        sortOption = { dealerPrice: 1 };
        break;
      case 'price-desc':
        sortOption = { dealerPrice: -1 };
        break;
      case 'points-asc':
        sortOption = { loyaltyPoints: 1 };
        break;
      case 'points-desc':
        sortOption = { loyaltyPoints: -1 };
        break;
      case 'name-asc':
        sortOption = { name: 1 };
        break;
      case 'name-desc':
        sortOption = { name: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      // Default is 'newest', already set
    }
    
    // Execute query
    const dealerSlots = await DealerSlot.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('originalProduct', 'name sku category price loyaltyPoints')
      .populate('organizationId', 'name');
    
    // Get total count for pagination
    const total = await DealerSlot.countDocuments(query);
    
    res.json({
      dealerSlots,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get dealer slots error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/dealer-slots/:id
// @desc     Get dealer slot by ID
// @access   Private + Client/Dealer (if authorized)
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const slotId = req.params.id;
    
    const dealerSlot = await DealerSlot.findById(slotId)
      .populate('originalProduct', 'name sku category price loyaltyPoints images specifications')
      .populate('clientId', 'name email')
      .populate('organizationId', 'name');
    
    if (!dealerSlot) {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    // Check access permissions
    if (req.user.role === 'client') {
      // Clients can only view their own slots
      if (dealerSlot.clientId._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'dealer') {
      // Dealers can only view active slots from their organization
      if (dealerSlot.status !== 'active') {
        return res.status(403).json({ message: 'This slot is not currently available' });
      }
    } else if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(dealerSlot);
  } catch (err) {
    console.error('Get dealer slot error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/dealer-slots
// @desc     Create a new dealer slot from client inventory
// @access   Private + Client
router.post('/', [
  authMiddleware, 
  clientMiddleware,
  sameOrganizationMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('originalProduct', 'Original product ID is required').isMongoId(),
  check('quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('dealerPrice', 'Dealer price must be a positive number').isFloat({ min: 0 }),
  check('loyaltyPoints', 'Loyalty points must be a positive number').isInt({ min: 0 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, description, originalProduct, quantity, 
    dealerPrice, loyaltyPoints, expiryDate, 
    redemptionRules, status = 'active'
  } = req.body;

  try {
    // Verify the product exists and client has purchased enough
    const product = await Product.findById(originalProduct);
    if (!product) {
      return res.status(404).json({ message: 'Original product not found' });
    }
    
    // Check if client has purchased this product
    const clientOrders = await ClientOrder.find({ 
      clientId: req.user.id, 
      'items.productId': originalProduct,
      status: { $in: ['approved', 'completed'] }
    });
    
    // Calculate total quantity purchased and allocated
    let totalPurchased = 0;
    for (const order of clientOrders) {
      for (const item of order.items) {
        if (item.productId.toString() === originalProduct) {
          totalPurchased += item.quantity;
        }
      }
    }
    
    // Calculate how much of this product the client has already allocated to dealer slots
    const existingSlots = await DealerSlot.find({
      clientId: req.user.id,
      originalProduct,
      status: { $ne: 'expired' }
    });
    
    const totalAllocated = existingSlots.reduce((total, slot) => total + slot.quantity, 0);
    
    // Check if client has enough unallocated inventory
    const availableToAllocate = totalPurchased - totalAllocated;
    if (availableToAllocate < quantity) {
      return res.status(400).json({ 
        message: `Insufficient inventory. You have ${availableToAllocate} units available to allocate.` 
      });
    }
    
    // Create new dealer slot
    const dealerSlot = new DealerSlot({
      name,
      description,
      originalProduct,
      clientId: req.user.id,
      organizationId: req.user.organizationId,
      quantity,
      availableQuantity: quantity,
      dealerPrice: Number(dealerPrice),
      loyaltyPoints: Number(loyaltyPoints),
      status,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      redemptionRules: redemptionRules || {
        pointsRequired: 0,
        discountPercentage: 0,
        additionalBenefits: []
      }
    });
    
    const savedSlot = await dealerSlot.save();
    
    res.status(201).json(savedSlot);
  } catch (err) {
    console.error('Create dealer slot error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/dealer-slots/:id
// @desc     Update dealer slot
// @access   Private + Client (owner only)
router.put('/:id', [
  authMiddleware,
  clientMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const slotId = req.params.id;
    
    // Find dealer slot
    let dealerSlot = await DealerSlot.findById(slotId);
    
    if (!dealerSlot) {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    // Verify ownership
    if (dealerSlot.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this slot.' });
    }
    
    // Extract fields to update
    const { 
      name, description, dealerPrice, loyaltyPoints,
      expiryDate, redemptionRules, status
    } = req.body;
    
    // Check if trying to increase quantity
    if (req.body.quantity && Number(req.body.quantity) > dealerSlot.quantity) {
      // Need to verify client has enough inventory
      const additional = Number(req.body.quantity) - dealerSlot.quantity;
      
      // Check if client has purchased this product
      const clientOrders = await ClientOrder.find({ 
        clientId: req.user.id, 
        'items.productId': dealerSlot.originalProduct,
        status: { $in: ['approved', 'completed'] }
      });
      
      // Calculate total quantity purchased and allocated
      let totalPurchased = 0;
      for (const order of clientOrders) {
        for (const item of order.items) {
          if (item.productId.toString() === dealerSlot.originalProduct.toString()) {
            totalPurchased += item.quantity;
          }
        }
      }
      
      // Calculate how much of this product the client has already allocated to dealer slots
      const existingSlots = await DealerSlot.find({
        clientId: req.user.id,
        originalProduct: dealerSlot.originalProduct,
        status: { $ne: 'expired' },
        _id: { $ne: slotId }
      });
      
      const totalAllocated = existingSlots.reduce((total, slot) => total + slot.quantity, 0) + dealerSlot.quantity;
      
      // Check if client has enough unallocated inventory
      const availableToAllocate = totalPurchased - totalAllocated + dealerSlot.quantity;
      if (availableToAllocate < Number(req.body.quantity)) {
        return res.status(400).json({ 
          message: `Insufficient inventory. You have ${availableToAllocate} units available to allocate.` 
        });
      }
    }

    // Build update object with fields that are provided
    const updateFields = {};
    
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (dealerPrice !== undefined) updateFields.dealerPrice = Number(dealerPrice);
    if (loyaltyPoints !== undefined) updateFields.loyaltyPoints = Number(loyaltyPoints);
    if (req.body.quantity !== undefined) {
      updateFields.quantity = Number(req.body.quantity);
      
      // If increasing quantity, also increase available quantity
      if (Number(req.body.quantity) > dealerSlot.quantity) {
        const increase = Number(req.body.quantity) - dealerSlot.quantity;
        updateFields.availableQuantity = dealerSlot.availableQuantity + increase;
      }
      // If decreasing quantity but not below sold units
      else if (Number(req.body.quantity) < dealerSlot.quantity) {
        const sold = dealerSlot.quantity - dealerSlot.availableQuantity;
        if (Number(req.body.quantity) < sold) {
          return res.status(400).json({ 
            message: `Cannot reduce quantity below ${sold} units as they have already been sold.` 
          });
        }
        updateFields.availableQuantity = Number(req.body.quantity) - sold;
      }
    }
    if (expiryDate !== undefined) updateFields.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (redemptionRules !== undefined) updateFields.redemptionRules = redemptionRules;
    if (status !== undefined) updateFields.status = status;
    
    // Update dealer slot
    dealerSlot = await DealerSlot.findByIdAndUpdate(
      slotId,
      { $set: updateFields },
      { new: true }
    );
    
    res.json(dealerSlot);
  } catch (err) {
    console.error('Update dealer slot error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    DELETE /api/dealer-slots/:id
// @desc     Delete dealer slot (if no sales have occurred)
// @access   Private + Client (owner only)
router.delete('/:id', [
  authMiddleware,
  clientMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const slotId = req.params.id;
    
    // Find dealer slot
    const dealerSlot = await DealerSlot.findById(slotId);
    
    if (!dealerSlot) {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    // Verify ownership
    if (dealerSlot.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this slot.' });
    }
    
    // Check if any units have been sold
    if (dealerSlot.quantity !== dealerSlot.availableQuantity) {
      // For safety, just mark as inactive instead of deleting
      dealerSlot.status = 'inactive';
      await dealerSlot.save();
      
      return res.json({ message: 'Dealer slot has been marked as inactive because units have been sold.' });
    }
    
    // Delete the slot
    await DealerSlot.findByIdAndDelete(slotId);
    
    res.json({ message: 'Dealer slot deleted successfully' });
  } catch (err) {
    console.error('Delete dealer slot error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dealer slot not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/dealer-slots/available
// @desc     Get all active dealer slots available to dealers
// @access   Private + Dealer
router.get('/available/list', [
  authMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const { 
      minPrice, maxPrice, minPoints, maxPoints,
      search, sort = 'newest',
      limit = 20, page = 1 
    } = req.query;
    
    // Build query for active slots only in dealer's organization
    const query = { 
      status: 'active',
      organizationId: req.user.organizationId,
      availableQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() } // Only show non-expired slots
    };
    
    // Price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.dealerPrice = {};
      if (minPrice !== undefined) query.dealerPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.dealerPrice.$lte = Number(maxPrice);
    }
    
    // Points filters
    if (minPoints !== undefined || maxPoints !== undefined) {
      query.loyaltyPoints = {};
      if (minPoints !== undefined) query.loyaltyPoints.$gte = Number(minPoints);
      if (maxPoints !== undefined) query.loyaltyPoints.$lte = Number(maxPoints);
    }
    
    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    switch (sort) {
      case 'price-asc':
        sortOption = { dealerPrice: 1 };
        break;
      case 'price-desc':
        sortOption = { dealerPrice: -1 };
        break;
      case 'points-asc':
        sortOption = { loyaltyPoints: 1 };
        break;
      case 'points-desc':
        sortOption = { loyaltyPoints: -1 };
        break;
      // Default is 'newest', already set
    }
    
    // Execute query
    const dealerSlots = await DealerSlot.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('originalProduct', 'name sku category')
      .populate('clientId', 'name');
    
    // Get total count for pagination
    const total = await DealerSlot.countDocuments(query);
    
    res.json({
      dealerSlots,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get available dealer slots error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 