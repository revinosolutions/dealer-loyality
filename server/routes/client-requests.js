// Backup endpoint for client purchase requests
import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const PurchaseRequest = mongoose.model('PurchaseRequest');
const User = mongoose.model('User');

// @route    GET /api/client-requests/purchase-requests
// @desc     Get purchase requests for currently authenticated client - fallback endpoint
// @access   Private (Client only)
router.get('/purchase-requests', authMiddleware, async (req, res) => {
  try {
    console.log('FALLBACK Client purchase requests endpoint accessed by user:', req.user.id, 'Role:', req.user.role);
    
    // This endpoint is for client users only
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'This endpoint is for client users only' });
    }
    
    const clientId = req.user.id;
    console.log(`Getting purchase requests for authenticated client: ${clientId}`);
    
    // Try to find purchase requests
    try {
      const requests = await PurchaseRequest.find({ clientId })
        .sort({ createdAt: -1 });
  
      console.log(`Found ${requests.length} purchase requests for client ${clientId}`);
      res.json({ requests });
    } catch (queryErr) {
      console.error('Database query error:', queryErr);
      res.status(500).json({ message: 'Database error when fetching purchase requests' });
    }
  } catch (err) {
    console.error('Error fetching client purchase requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a fallback route for admin purchase requests
// @route    GET /api/client-requests/admin-purchase-requests-fallback
// @desc     Fallback endpoint for admin purchase requests when regular endpoint fails
// @access   Private (Admin only)
router.get('/admin-purchase-requests-fallback', authMiddleware, async (req, res) => {
  try {
    console.log('FALLBACK Admin purchase requests endpoint accessed by user:', req.user.id, 'Role:', req.user.role);
    
    // This endpoint is for admin users only
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'This endpoint is for admin users only' });
    }
    
    // Get the admin's organization ID
    let organizationId = req.user.organizationId;
    if (!organizationId) {
      // Try to get organization ID directly from user document for extra safety
      try {
        const user = await User.findById(req.user.id);
        if (user && user.organizationId) {
          organizationId = user.organizationId;
        }
      } catch (userErr) {
        console.error('Error fetching user for organization ID:', userErr);
      }
    }
    
    console.log('Fallback search - Organization ID:', organizationId);
    
    // Simple, minimal query with no fancy filters
    const baseQuery = {};
    
    // Add organization filter if we have it
    if (organizationId) {
      baseQuery.organizationId = organizationId;
    } else {
      // Use admin ID as fallback filter if no organization
      baseQuery.createdBy = req.user.id;
    }
    
    // Add very basic status filter only if specified and valid
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      baseQuery.status = req.query.status;
    }
    
    console.log('Fallback query:', baseQuery);
    
    // Try to find purchase requests with minimal query
    try {
      const requests = await PurchaseRequest.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(50); // Limit results for performance
  
      console.log(`Fallback found ${requests.length} purchase requests`);
      res.json({ 
        requests,
        source: 'fallback',
        filter: baseQuery
      });
    } catch (queryErr) {
      console.error('Database query error in fallback endpoint:', queryErr);
      
      // Ultimate fallback - try with no filters
      try {
        console.log('Attempting fallback query with no filters');
        const allRequests = await PurchaseRequest.find({})
          .sort({ createdAt: -1 })
          .limit(20);
          
        // Filter on the client side instead
        const filteredRequests = allRequests.filter(req => {
          // Match by organization if we have it
          if (organizationId && req.organizationId) {
            return req.organizationId.toString() === organizationId.toString();
          }
          // Otherwise return all
          return true;
        });
        
        console.log(`Last-resort fallback found ${filteredRequests.length} purchase requests`);
        res.json({ 
          requests: filteredRequests,
          source: 'last-resort-fallback'
        });
      } catch (lastErr) {
        console.error('Last-resort fallback also failed:', lastErr);
        res.status(500).json({ message: 'All fallback methods failed' });
      }
    }
  } catch (err) {
    console.error('Error in admin purchase requests fallback route:', err);
    res.status(500).json({ 
      message: 'Server error in fallback route',
      error: err.message
    });
  }
});

export default router;
