import express from 'express';
import { body, validationResult } from 'express-validator';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/inventory
 * @desc    Get inventory movements with filtering options
 * @access  Private - Super Admin and Client
 */
router.get('/', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    const {
      productId,
      location,
      movementType,
      startDate,
      endDate,
      limit = 20,
      page = 1
    } = req.query;
    
    // Build query
    const query = {};
    
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
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/inventory/product/:productId
 * @desc    Get inventory history for a specific product
 * @access  Private - Super Admin and Client
 */
router.get('/product/:productId', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, movementType, location } = req.query;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get inventory history
    const inventoryHistory = await Inventory.getProductHistory(productId, {
      startDate,
      endDate,
      movementType,
      location
    });
    
    res.json(inventoryHistory);
  } catch (error) {
    console.error('Error fetching product inventory history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/inventory
 * @desc    Record inventory movement
 * @access  Private - Super Admin only
 */
router.post('/', authMiddleware, authorize(['admin']), async (req, res) => {
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
    
    // Record inventory movement
    const inventoryMovement = await Inventory.recordMovement({
      productId,
      location,
      quantity,
      movementType,
      batchNumber,
      referenceOrder,
      performedBy: req.user.id,
      notes,
      metadata
    });
    
    res.status(201).json(inventoryMovement);
  } catch (error) {
    console.error('Error recording inventory movement:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route   GET /api/inventory/locations
 * @desc    Get all unique inventory locations
 * @access  Private - Super Admin and Client
 */
router.get('/locations', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    const locations = await Inventory.distinct('location');
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get products with low stock (below reorder level)
 * @access  Private - Super Admin and Client
 */
router.get('/low-stock', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: {
        $lte: ['$stock', '$reorderLevel']
      }
    }).select('name sku stock reorderLevel category status');
    
    res.json(lowStockProducts);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/inventory/summary
 * @desc    Get inventory summary statistics
 * @access  Private - Super Admin and Client
 */
router.get('/summary', authMiddleware, authorize(['admin', 'client']), async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments();
    
    // Get total inventory value
    const inventoryValue = await Product.aggregate([
      {
        $project: {
          value: {
            $multiply: ['$stock', '$price']
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$value' }
        }
      }
    ]);
    
    // Get low stock products count
    const lowStockCount = await Product.countDocuments({
      $expr: {
        $lte: ['$stock', '$reorderLevel']
      }
    });
    
    // Get out of stock products count
    const outOfStockCount = await Product.countDocuments({
      'stock': 0
    });
    
    // Get inventory movements in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMovements = await Inventory.countDocuments({
      date: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      totalProducts,
      inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].total : 0,
      lowStockCount,
      outOfStockCount,
      recentMovements
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
