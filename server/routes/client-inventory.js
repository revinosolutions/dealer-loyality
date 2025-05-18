import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const Product = mongoose.model('Product');
const PurchaseRequest = mongoose.model('PurchaseRequest');

/**
 * @route    GET /api/client-inventory
 * @desc     Get client's inventory with approved stock data
 * @access   Private (Client only)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Ensure user is a client
    if (req.user.role !== 'client' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Client privileges required.' });
    }

    console.log(`Fetching inventory for client: ${req.user._id}, role: ${req.user.role}`);
    
    // Get client's inventory products with a more comprehensive query
    const clientProducts = await Product.find({
      $and: [
        // Must be created by this client
        { createdBy: req.user._id },
        // And must be either:
        { $or: [
          // Explicitly marked as client uploaded
          { isClientUploaded: true },
          // Or has a CLIENT- SKU prefix 
          { sku: { $regex: '^CLIENT-' } },
          // Or has client inventory data
          { 'clientInventory.currentStock': { $exists: true } }
        ]}
      ]
    }).sort({ 'clientInventory.lastUpdated': -1 });
    
    console.log(`Found ${clientProducts.length} products for client ${req.user._id}`);

    // Get client's approved purchase requests
    const approvedRequests = await PurchaseRequest.find({
      clientId: req.user._id,
      status: 'approved'
    })
    .populate('productId', 'name sku price images category')
    .sort({ updatedAt: -1 });

    // Calculate total approved stock
    let totalApprovedStock = 0;
    clientProducts.forEach(product => {
      totalApprovedStock += product.stock || product.clientInventory?.currentStock || 0;
    });

    // Return combined response
    res.json({
      success: true,
      totalItems: clientProducts.length,
      totalApprovedStock,
      products: clientProducts.map(product => ({
        id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        price: product.price,
        images: product.images,
        stock: product.stock || product.clientInventory?.currentStock || 0,
        reorderLevel: product.clientInventory?.reorderLevel || 5,
        lastUpdated: product.clientInventory?.lastUpdated || product.updatedAt
      })),
      approvalHistory: approvedRequests.map(request => ({
        id: request._id,
        productId: request.productId?._id,
        productName: request.productName || (request.productId?.name),
        quantity: request.quantity,
        price: request.price,
        totalPrice: request.price * request.quantity,
        approvedDate: request.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching client inventory:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client inventory',
      error: error.message
    });
  }
});

/**
 * @route    GET /api/client-inventory/summary
 * @desc     Get summary of client's inventory with approved stock data
 * @access   Private (Client only)
 */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    // Ensure user is a client
    if (req.user.role !== 'client' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Client privileges required.' });
    }

    // Get count of client's inventory products with the same improved query
    const productCount = await Product.countDocuments({
      $and: [
        // Must be created by this client
        { createdBy: req.user._id },
        // And must be either:
        { $or: [
          // Explicitly marked as client uploaded
          { isClientUploaded: true },
          // Or has a CLIENT- SKU prefix 
          { sku: { $regex: '^CLIENT-' } },
          // Or has client inventory data
          { 'clientInventory.currentStock': { $exists: true } }
        ]}
      ]
    });

    // Get count of client's approved purchase requests
    const approvedRequestCount = await PurchaseRequest.countDocuments({
      clientId: req.user._id,
      status: 'approved'
    });

    // Calculate total approved stock with the same comprehensive query
    const stockAggregate = await Product.aggregate([
      {
        $match: {
          $and: [
            { createdBy: mongoose.Types.ObjectId(req.user._id) },
            { $or: [
              { isClientUploaded: true },
              { sku: { $regex: '^CLIENT-' } },
              { 'clientInventory.currentStock': { $exists: true } }
            ]}
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalStock: { 
            $sum: { 
              $ifNull: ['$stock', { $ifNull: ['$clientInventory.currentStock', 0] }] 
            } 
          },
          lowStockCount: {
            $sum: {
              $cond: [
                { $lt: [
                  { $ifNull: ['$stock', { $ifNull: ['$clientInventory.currentStock', 0] }] },
                  { $ifNull: ['$clientInventory.reorderLevel', 5] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const totalStock = stockAggregate.length > 0 ? stockAggregate[0].totalStock : 0;
    const lowStockCount = stockAggregate.length > 0 ? stockAggregate[0].lowStockCount : 0;

    // Return summary response
    res.json({
      success: true,
      productCount,
      approvedRequestCount,
      totalStock,
      lowStockCount,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Error fetching client inventory summary:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client inventory summary',
      error: error.message
    });
  }
});

export default router; 