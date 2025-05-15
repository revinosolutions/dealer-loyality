import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, clientMiddleware, restrictAdminCreatedClients } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Get models
const Inventory = mongoose.model('Inventory');
const Product = mongoose.model('Product');

// Get all inventory movements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      productId, location, movementType, 
      startDate, endDate, limit = 20, page = 1 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'dealer') {
      return res.status(403).json({ message: 'Access denied. Dealers cannot view inventory movements.' });
    } else if (req.user.role === 'client') {
      // Clients can only see their own inventory movements
      // This would require additional logic to determine which products are related to the client
    }
    
    if (productId) {
      query.productId = productId;
    }
    
    if (location) {
      query.location = location;
    }
    
    if (movementType) {
      query.movementType = movementType;
    }
    
    // Date range
    if (startDate || endDate) {
      query.date = {};
      
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    // Handle pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query with pagination
    const inventoryMovements = await Inventory.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('productId', 'name sku')
      .populate('performedBy', 'name email role')
      .populate('referenceOrder', 'orderNumber');
    
    // Get total count for pagination
    const total = await Inventory.countDocuments(query);
    
    res.json({
      inventoryMovements,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get inventory movements error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory for a specific product
router.get('/product/:productId', [authMiddleware, clientMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, movementType, location } = req.query;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Build query
    const query = { productId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (movementType) {
      query.movementType = movementType;
    }
    
    if (location) {
      query.location = location;
    }
    
    // Get inventory history
    const inventoryHistory = await Inventory.find(query)
      .sort({ date: -1 })
      .populate('performedBy', 'name email role')
      .populate('referenceOrder');
    
    res.json(inventoryHistory);
  } catch (err) {
    console.error('Get product inventory history error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Record inventory movement
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('productId', 'Product ID is required').not().isEmpty(),
  check('location', 'Location is required').not().isEmpty(),
  check('quantity', 'Quantity must be a number').isNumeric(),
  check('movementType', 'Movement type is required').isIn(['in', 'out', 'adjustment', 'transfer'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      productId,
      location,
      quantity,
      movementType,
      batchNumber,
      referenceOrder,
      notes,
      metadata
    } = req.body;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create inventory movement
    const newMovement = new Inventory({
      productId,
      location,
      quantity: Number(quantity),
      movementType,
      batchNumber,
      referenceOrder,
      performedBy: req.user.id,
      notes,
      metadata,
      previousStock: product.stock || 0
    });
    
    // Update product stock based on movement type
    let newStock = product.stock || 0;
    
    switch (movementType) {
      case 'in':
        newStock += Number(quantity);
        break;
      case 'out':
        if (newStock < Number(quantity)) {
          return res.status(400).json({ message: 'Not enough stock available' });
        }
        newStock -= Number(quantity);
        break;
      case 'adjustment':
        newStock = Number(quantity); // Direct set to the new quantity
        break;
      case 'transfer':
        // Transfer doesn't change total stock, just location
        break;
    }
    
    // Update the product stock
    product.stock = newStock;
    await product.save();
    
    // Update the new movement with final stock
    newMovement.newStock = newStock;
    await newMovement.save();
    
    res.status(201).json(newMovement);
  } catch (err) {
    console.error('Record inventory movement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory locations
router.get('/locations', [authMiddleware, clientMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    const locations = await Inventory.distinct('location');
    res.json(locations);
  } catch (err) {
    console.error('Get inventory locations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get low-stock products
router.get('/low-stock', [authMiddleware, clientMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    // Define low stock threshold (could be made configurable)
    const threshold = 10;
    
    const lowStockProducts = await Product.find({
      stock: { $lte: threshold, $gt: 0 }
    }).select('name sku price stock category images');
    
    res.json(lowStockProducts);
  } catch (err) {
    console.error('Get low-stock products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get out-of-stock products
router.get('/out-of-stock', [authMiddleware, clientMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    const outOfStockProducts = await Product.find({
      stock: 0,
      status: 'active'
    }).select('name sku price stock category images');
    
    res.json(outOfStockProducts);
  } catch (err) {
    console.error('Get out-of-stock products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory summary
router.get('/summary', [authMiddleware, clientMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments({ status: 'active' });
    
    // Get total inventory value
    const inventoryValue = await Product.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ['$stock', '$price'] } }
        }
      }
    ]);
    
    // Get low stock and out of stock counts
    const lowStockThreshold = 10;
    const lowStockCount = await Product.countDocuments({
      stock: { $lte: lowStockThreshold, $gt: 0 },
      status: 'active'
    });
    
    const outOfStockCount = await Product.countDocuments({
      stock: 0,
      status: 'active'
    });
    
    // Get recent movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMovementsCount = await Inventory.countDocuments({
      date: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      totalProducts,
      inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].value : 0,
      lowStockCount,
      outOfStockCount,
      recentMovementsCount
    });
  } catch (err) {
    console.error('Get inventory summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 