// Direct database access route for client purchase requests
import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const PurchaseRequest = mongoose.model('PurchaseRequest');

// @route    GET /api/client-only/purchase-requests
// @desc     Direct database access for client purchase requests - bypasses normal routes
// @access   Private (Client only)
router.get('/purchase-requests', authMiddleware, async (req, res) => {
  try {
    // Log extensive debugging information
    console.log('DIRECT CLIENT ACCESS - User info:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user?.email,
      clientId: req.user.clientId
    });
    
    console.log('DIRECT CLIENT ACCESS - Headers:', req.headers);
    
    // This endpoint is for client users only - but let's be more flexible for testing
    let isClientUser = req.user.role === 'client';
    let clientId = req.user.id;
    
    // Allow headers to override if testing
    if (req.headers['x-client-id']) {
      console.log('Using client ID from X-Client-ID header:', req.headers['x-client-id']);
      clientId = req.headers['x-client-id'];
      isClientUser = true; // Force client role for testing
    }
    
    if (!isClientUser) {
      console.warn(`User ${req.user.id} with role ${req.user.role} attempted to access client-only endpoint`);
      return res.status(403).json({ message: 'This endpoint is for client users only' });
    }
    
    if (!clientId) {
      console.error('No client ID available for purchase requests query');
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    console.log(`DIRECT CLIENT ACCESS - Querying for client ID: ${clientId}`);
    
    // Try to find purchase requests with generous error handling
    try {
      // First attempt - exact match on clientId
      let requests = await PurchaseRequest.find({ clientId })
        .sort({ createdAt: -1 });
      
      // If no results, try string comparison (in case of ObjectId vs string issues)
      if (!requests || requests.length === 0) {
        console.log('No results with exact match, trying string comparison...');
        // Get all requests and filter by string comparison
        const allRequests = await PurchaseRequest.find({})
          .sort({ createdAt: -1 });
        
        requests = allRequests.filter(req => 
          req.clientId.toString() === clientId.toString() ||
          (typeof req.clientId === 'string' && req.clientId === clientId)
        );
        
        console.log(`Found ${requests.length} requests after string comparison`);
      }
  
      console.log(`DIRECT CLIENT ACCESS - Found ${requests.length} purchase requests for client ${clientId}`);
      
      // Return the records in a standardized format
      res.json({ 
        requests,
        message: 'Retrieved from direct database access route',
        clientId
      });
    } catch (queryErr) {
      console.error('DIRECT CLIENT ACCESS - Database query error:', queryErr);
      res.status(500).json({ 
        message: 'Database error when fetching purchase requests',
        error: queryErr.message
      });
    }
  } catch (err) {
    console.error('DIRECT CLIENT ACCESS - Error fetching client purchase requests:', err);
    res.status(500).json({ 
      message: 'Server error in direct access route',
      error: err.message
    });
  }
});

// @route    GET /api/client-only/purchase-requests/direct-db
// @desc     Direct MongoDB-style query for purchase requests - simulates MongoDB find()
// @access   Private (Client only)
router.get('/purchase-requests/direct-db', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 DIRECT DB QUERY - Headers:', req.headers);
    console.log('🔍 DIRECT DB QUERY - Query params:', req.query);
    
    // Get client ID from user or headers
    let clientId = req.user.id;
    if (req.headers['x-client-id']) {
      clientId = req.headers['x-client-id'];
      console.log('Using client ID from X-Client-ID header:', clientId);
    }
    
    // Try to parse query object if provided
    let findQuery = { clientId };
    
    try {
      if (req.query.query) {
        const parsedQuery = JSON.parse(decodeURIComponent(req.query.query));
        console.log('Parsed query:', parsedQuery);
        // Only apply the parsed query if it contains a clientId field - for security
        if (parsedQuery.clientId) {
          findQuery = parsedQuery;
        }
      }
    } catch (queryError) {
      console.error('Error parsing query:', queryError);
      // Continue with default query
    }
    
    console.log('🔍 Final MongoDB-style query:', findQuery);
    
    // Execute the query - but with safeguards
    // First try to limit by client ID for security
    let query = { clientId };
    
    // If the parsed query contains a $in operator for clientId, use it
    if (findQuery.clientId && findQuery.clientId.$in && Array.isArray(findQuery.clientId.$in)) {
      // Filter out any non-string values for security
      const validIds = findQuery.clientId.$in.filter(id => 
        typeof id === 'string' || (typeof id === 'object' && id.$toString)
      );
      
      if (validIds.length > 0) {
        query = { 
          $or: [
            { clientId: { $in: validIds } },
            { clientId: clientId } // Always include the authenticated user's clientId
          ]
        };
      }
    }
    
    console.log('🔍 Executing find query:', query);
    
    // Execute the find operation
    const results = await PurchaseRequest.find(query)
      .sort({ createdAt: -1 });
    
    console.log(`🔍 Found ${results.length} results`);
    
    // Return direct results
    return res.json({
      results,
      query,
      message: 'Direct MongoDB-style query executed successfully'
    });
  } catch (err) {
    console.error('🔍 DIRECT DB QUERY ERROR:', err);
    res.status(500).json({ 
      message: 'Error executing direct database query',
      error: err.message
    });
  }
});

// @route    DELETE /api/client-only/purchase-requests/all
// @desc     Delete all purchase requests from the database
// @access   Private (Admin only)
router.delete('/purchase-requests/all', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or superadmin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      console.error(`Unauthorized attempt to delete all purchase requests by user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({ 
        message: 'Access denied. Only administrators can delete all purchase requests.',
        success: false
      });
    }
    
    console.log(`📛 ADMIN ${req.user.id} (${req.user.email}) REQUESTED DELETION OF ALL PURCHASE REQUESTS`);
    
    // Require confirmation header for safety
    const confirmHeader = req.headers['x-confirm-delete'];
    if (confirmHeader !== 'DELETE_ALL_PURCHASE_REQUESTS_CONFIRM') {
      return res.status(400).json({
        message: 'Confirmation header missing. Add X-Confirm-Delete header with the value DELETE_ALL_PURCHASE_REQUESTS_CONFIRM',
        success: false
      });
    }
    
    // Count records before deletion
    const count = await PurchaseRequest.countDocuments({});
    console.log(`Found ${count} purchase requests to delete`);
    
    // Delete all purchase requests
    const result = await PurchaseRequest.deleteMany({});
    
    console.log(`🗑️ DELETED ${result.deletedCount} PURCHASE REQUESTS FROM DATABASE`);
    
    return res.json({
      message: `Successfully deleted ${result.deletedCount} purchase requests from the database.`,
      deletedCount: result.deletedCount,
      success: true
    });
  } catch (err) {
    console.error('Error deleting purchase requests:', err);
    res.status(500).json({ 
      message: 'Error deleting purchase requests',
      error: err.message,
      success: false
    });
  }
});

// @route    GET /api/client-only/purchase-requests/delete-all
// @desc     Delete all purchase requests (GET method for easier testing)
// @access   Private (Admin only)
router.get('/purchase-requests/delete-all', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin or superadmin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      console.error(`Unauthorized attempt to delete all purchase requests by user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({ 
        message: 'Access denied. Only administrators can delete all purchase requests.',
        success: false
      });
    }
    
    console.log(`📛 ADMIN ${req.user.id} (${req.user.email}) REQUESTED DELETION OF ALL PURCHASE REQUESTS VIA GET ENDPOINT`);
    
    // Special confirmation via query parameter (for GET request ease)
    const confirmKey = req.query.confirm;
    if (confirmKey !== 'yes-delete-all-purchase-requests') {
      return res.status(400).json({
        message: 'Confirmation key missing. Add ?confirm=yes-delete-all-purchase-requests to URL',
        success: false
      });
    }
    
    // Count records before deletion
    const count = await PurchaseRequest.countDocuments({});
    console.log(`Found ${count} purchase requests to delete`);
    
    // Delete all purchase requests
    const result = await PurchaseRequest.deleteMany({});
    
    console.log(`🗑️ DELETED ${result.deletedCount} PURCHASE REQUESTS FROM DATABASE`);
    
    return res.json({
      message: `Successfully deleted ${result.deletedCount} purchase requests from the database.`,
      deletedCount: result.deletedCount,
      success: true
    });
  } catch (err) {
    console.error('Error deleting purchase requests:', err);
    res.status(500).json({ 
      message: 'Error deleting purchase requests',
      error: err.message,
      success: false
    });
  }
});

// DANGER: ONLY FOR DEVELOPMENT/TESTING PURPOSES
// @route    GET /api/client-only/purchase-requests/emergency-delete
// @desc     Emergency delete all purchase requests without authentication (DEVELOPMENT ONLY)
// @access   Public (DANGER - NO AUTHENTICATION!)
router.get('/purchase-requests/emergency-delete', async (req, res) => {
  try {
    // Simple secret key confirmation
    const secretKey = req.query.key;
    if (secretKey !== 'delete-all-purchase-requests-now') {
      return res.status(400).json({
        message: 'Missing or invalid secret key',
        success: false
      });
    }
    
    console.log('⚠️ EMERGENCY DELETION OF ALL PURCHASE REQUESTS REQUESTED!');
    
    // Count records before deletion
    const count = await PurchaseRequest.countDocuments({});
    console.log(`Found ${count} purchase requests to delete`);
    
    // Delete all purchase requests
    const result = await PurchaseRequest.deleteMany({});
    
    console.log(`🗑️ EMERGENCY DELETE: ${result.deletedCount} PURCHASE REQUESTS DELETED FROM DATABASE`);
    
    return res.json({
      message: `Successfully deleted ${result.deletedCount} purchase requests from the database.`,
      deletedCount: result.deletedCount,
      success: true
    });
  } catch (err) {
    console.error('Error in emergency delete:', err);
    res.status(500).json({ 
      message: 'Error deleting purchase requests',
      error: err.message,
      success: false
    });
  }
});

export default router; 