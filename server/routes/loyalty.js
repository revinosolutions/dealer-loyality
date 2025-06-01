import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import LoyaltyPoints from '../../models/LoyaltyPoints.js';

const router = express.Router();

/**
 * @route    GET /api/loyalty/balance
 * @desc     Get client's current loyalty points balance
 * @access   Private (Client)
 */
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get client ID
    const clientId = req.user._id;
    console.log(`[LOYALTY] Fetching loyalty balance for client: ${clientId}`);
    
    // Find or create loyalty points record
    const loyaltyPoints = await LoyaltyPoints.findOrCreate(clientId);
    
    // Return the balance
    res.json({
      success: true,
      points: loyaltyPoints.points,
      totalEarned: loyaltyPoints.totalEarnedPoints,
      totalRedeemed: loyaltyPoints.totalRedeemedPoints,
      lastUpdated: loyaltyPoints.updatedAt
    });
  } catch (error) {
    console.error('[LOYALTY] Error fetching loyalty balance:', error);
    res.status(500).json({ 
      message: 'Server error while fetching loyalty balance',
      error: error.message
    });
  }
});

/**
 * @route    GET /api/loyalty/history
 * @desc     Get client's loyalty points transaction history
 * @access   Private (Client)
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get limit from query parameters or default to 50
    const limit = parseInt(req.query.limit) || 50;
    
    // Get client ID
    const clientId = req.user._id;
    console.log(`[LOYALTY] Fetching loyalty history for client: ${clientId}`);
    
    // Find loyalty points record
    const loyaltyPoints = await LoyaltyPoints.findOne({ clientId });
    
    if (!loyaltyPoints) {
      return res.json({
        success: true,
        transactions: [],
        message: 'No loyalty points records found for this client'
      });
    }
    
    // Get transactions sorted by date (most recent first)
    const transactions = loyaltyPoints.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
    
    // Return the transaction history
    res.json({
      success: true,
      currentBalance: loyaltyPoints.points,
      totalTransactions: loyaltyPoints.transactions.length,
      transactions: transactions.map(t => ({
        id: t._id,
        date: t.date,
        type: t.type,
        points: t.points,
        description: t.description,
        productId: t.productId,
        referenceType: t.referenceType,
        metadata: t.metadata
      }))
    });
  } catch (error) {
    console.error('[LOYALTY] Error fetching loyalty history:', error);
    res.status(500).json({ 
      message: 'Server error while fetching loyalty history',
      error: error.message
    });
  }
});

/**
 * @route    POST /api/loyalty/redeem
 * @desc     Redeem loyalty points
 * @access   Private (Client)
 */
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate input
    const { points, description } = req.body;
    
    if (!points || isNaN(points) || points <= 0) {
      return res.status(400).json({ message: 'Valid points amount is required' });
    }
    
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    // Get client ID
    const clientId = req.user._id;
    console.log(`[LOYALTY] Processing redemption of ${points} points for client: ${clientId}`);
    
    // Find loyalty points record
    const loyaltyPoints = await LoyaltyPoints.findOne({ clientId });
    
    if (!loyaltyPoints) {
      return res.status(404).json({
        success: false,
        message: 'No loyalty points account found for this client'
      });
    }
    
    // Check if client has enough points
    if (loyaltyPoints.points < points) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. Available: ${loyaltyPoints.points}, Requested: ${points}`
      });
    }
    
    // Redeem the points
    await loyaltyPoints.redeemPoints(points, {
      description,
      referenceType: 'redemption',
      metadata: {
        requestedBy: req.user.name || req.user.email,
        requestDate: new Date()
      }
    });
    
    // Return updated balance
    res.json({
      success: true,
      message: `Successfully redeemed ${points} points`,
      previousBalance: loyaltyPoints.points + points,
      currentBalance: loyaltyPoints.points,
      pointsRedeemed: points
    });
  } catch (error) {
    console.error('[LOYALTY] Error redeeming points:', error);
    res.status(500).json({ 
      message: 'Server error while redeeming points',
      error: error.message
    });
  }
});

/**
 * @route    GET /api/loyalty/client/:clientId
 * @desc     Get loyalty points for a specific client (Admin only)
 * @access   Private (Admin)
 */
router.get('/client/:clientId', authMiddleware, async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    console.log(`[LOYALTY] Admin fetching loyalty data for client: ${clientId}`);
    
    // Find or create loyalty points record
    const loyaltyPoints = await LoyaltyPoints.findOrCreate(clientId);
    
    // Return the data
    res.json({
      success: true,
      clientId,
      points: loyaltyPoints.points,
      totalEarned: loyaltyPoints.totalEarnedPoints,
      totalRedeemed: loyaltyPoints.totalRedeemedPoints,
      transactionCount: loyaltyPoints.transactions.length,
      lastTransaction: loyaltyPoints.transactions.length > 0 ? 
        loyaltyPoints.transactions[loyaltyPoints.transactions.length - 1] : null,
      lastUpdated: loyaltyPoints.updatedAt
    });
  } catch (error) {
    console.error('[LOYALTY] Error fetching client loyalty data:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client loyalty data',
      error: error.message
    });
  }
});

/**
 * @route    POST /api/loyalty/adjust
 * @desc     Adjust loyalty points for a client (Admin only)
 * @access   Private (Admin)
 */
router.post('/adjust', authMiddleware, async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Validate input
    const { clientId, points, description } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    if (!points || isNaN(points)) {
      return res.status(400).json({ message: 'Valid points amount is required' });
    }
    
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }
    
    console.log(`[LOYALTY] Admin adjusting loyalty points for client ${clientId}: ${points > 0 ? 'Adding' : 'Deducting'} ${Math.abs(points)} points`);
    
    // Find or create loyalty points record
    const loyaltyPoints = await LoyaltyPoints.findOrCreate(clientId);
    
    // Adjust the points
    if (points > 0) {
      // Add points
      await loyaltyPoints.addPoints(points, {
        description,
        type: 'adjusted',
        referenceType: 'adjustment',
        metadata: {
          adjustedBy: req.user.name || req.user.email,
          adjustedByUserId: req.user._id,
          adjustmentDate: new Date()
        }
      });
    } else if (points < 0) {
      // Check if client has enough points to deduct
      if (loyaltyPoints.points < Math.abs(points)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient points. Available: ${loyaltyPoints.points}, Attempting to deduct: ${Math.abs(points)}`
        });
      }
      
      // Deduct points
      await loyaltyPoints.redeemPoints(Math.abs(points), {
        description,
        type: 'adjusted',
        referenceType: 'adjustment',
        metadata: {
          adjustedBy: req.user.name || req.user.email,
          adjustedByUserId: req.user._id,
          adjustmentDate: new Date()
        }
      });
    }
    
    // Return updated balance
    res.json({
      success: true,
      message: `Successfully ${points > 0 ? 'added' : 'deducted'} ${Math.abs(points)} points`,
      currentBalance: loyaltyPoints.points,
      pointsAdjusted: points
    });
  } catch (error) {
    console.error('[LOYALTY] Error adjusting loyalty points:', error);
    res.status(500).json({ 
      message: 'Server error while adjusting loyalty points',
      error: error.message
    });
  }
});

export default router; 