import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import LoyaltyPoints from '../../models/LoyaltyPoints.js';

const router = express.Router();
const Product = mongoose.model('Product');
const User = mongoose.model('User');
const PurchaseRequest = mongoose.model('PurchaseRequest');
const Order = mongoose.model('Order');

// @route    GET /api/products
// @desc     Get all products with filtering
// @access   Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      status, 
      search, 
      sort = 'createdAt',
      limit = 50,
      page = 1,
      isClientUploaded,
      createdBy,
      hasClientInventory,
      clientId,
      organizationId,
      _id
    } = req.query;
    
    console.log('GET /products with query:', req.query);
    
    // Build the filter object
    const filter = {};
    
    // If ID is provided, search by ID
    if (_id) {
      filter._id = _id;
    }
    
    // Filter by organization
    if (organizationId) {
      filter.organizationId = organizationId;
    } else if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId;
    }
    
    // Filter by category
    if (category) {
      filter.category = category;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Filter by status
    if (status) {
      filter.status = status;
    }
    
    // Handle client uploaded status based on user role
    if (isClientUploaded !== undefined) {
      const boolValue = isClientUploaded === 'true' || isClientUploaded === true;
      filter.isClientUploaded = boolValue;
    } else if (req.user.role === 'client') {
      // For clients, show both admin products and their own products
      filter.$or = [
        { isClientUploaded: false }, // Admin products
        { isClientUploaded: true, createdBy: req.user._id } // Client's own products
      ];
    }
    
    // Filter by creator
    if (createdBy) {
      filter.createdBy = createdBy;
    }
    
    // Search term in name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Process client inventory filter
    if (hasClientInventory === 'true' && clientId) {
      console.log(`Finding client inventory products for client: ${clientId}`);
      
      // Convert clientId to ObjectId if it's a valid ObjectId string
      let clientIdObj = clientId;
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        clientIdObj = new mongoose.Types.ObjectId(clientId);
        console.log(`Converted clientId to ObjectId: ${clientIdObj}`);
      }
      
      // For client inventory, show both admin products and client's own products
      filter.$or = [
        // Admin products (not client uploaded)
        { isClientUploaded: false },
        
        // Client's own products
        { isClientUploaded: true, createdBy: clientIdObj },
        
        // Products with client inventory
        { 'clientInventory.initialStock': { $exists: true } },
        { 'clientInventory.currentStock': { $exists: true } }
      ];
    }

    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    
    // Calculate skip value for pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Prepare sort object
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortObj[sortField] = sortOrder;
    
    // Execute query with pagination
    let productsQuery = Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));
    
    // Execute query
    const products = await productsQuery;
    
    console.log(`Found ${products.length} products matching the criteria`);
    
    // Return the products with pagination info
    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== PURCHASE REQUEST ROUTES ====================
// These routes need to be BEFORE any :id routes to prevent conflicts

// @route    POST /api/products/purchase-requests
// @desc     Create a new purchase request
// @access   Private (Client)
router.post('/purchase-requests', 
  [
    authMiddleware,
    [
      check('productId', 'Product ID is required').not().isEmpty(),
      check('quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
      check('price', 'Price must be a positive number').isFloat({ min: 0 })
    ]
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get the user from the database to access all fields
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get the product to ensure it exists and fetch the product name
      const product = await Product.findById(req.body.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Create the purchase request
      const newPurchaseRequest = new PurchaseRequest({
        productId: req.body.productId,
        productName: product.name,
        clientId: req.user.id,
        clientName: user.name,
        quantity: req.body.quantity,
        price: req.body.price,
        notes: req.body.notes || '',
        organizationId: user.organizationId || product.organizationId
      });

      await newPurchaseRequest.save();

      // Return the created purchase request
      res.status(201).json(newPurchaseRequest);
    } catch (err) {
      console.error('Error creating purchase request:', err);
      res.status(500).json({ message: 'Server error' });
    }
});

// @route    GET /api/products/purchase-requests
// @desc     Get all purchase requests (admin view)
// @access   Private (Admin)
router.get('/purchase-requests', authMiddleware, async (req, res) => {
  try {
    // Log received parameters for debugging
    console.log('Purchase requests endpoint accessed with query:', req.query);
    console.log('User details:', { id: req.user.id, role: req.user.role, organizationId: req.user.organizationId });
    
    // Check user role - only allow admin and superadmin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Create filter with proper error handling for organization ID
    const filter = {};
    
    // Handle organizationId from either user or query params with validation
    const organizationId = req.query.organizationId || req.user.organizationId;
    
    if (organizationId) {
      try {
        // Validate organization ID format if it's provided as a string
        if (typeof organizationId === 'string' && organizationId.length >= 12) {
          filter.organizationId = organizationId;
          console.log(`Using organization ID filter: ${organizationId}`);
        } else {
          console.warn(`Invalid organization ID format: ${organizationId}, using user's organization ID as fallback`);
          filter.organizationId = req.user.organizationId;
        }
      } catch (idError) {
        console.error('Error processing organization ID:', idError);
        // Continue without filter if the ID processing fails
      }
    }
    
    // Ensure we have an organization ID (critical filter)
    if (!filter.organizationId) {
      console.warn('No valid organization ID found, using user ID as fallback filter');
      // Use alternative filter based on user ID if no organization available
      filter.createdBy = req.user.id;
    }
    
    // Add status filter if provided
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
      console.log(`Using status filter: ${req.query.status}`);
    }

    console.log('Final filter for purchase requests:', filter);

    // Get all purchase requests with error handling
    try {
      const requests = await PurchaseRequest.find(filter)
        .populate('productId', 'name sku price images category')
        .populate('clientId', 'name email company')
        .sort({ createdAt: -1 })
        .limit(100);

      console.log(`Found ${requests.length} purchase requests matching filter`);
      res.json(requests);
    } catch (queryError) {
      console.error('Database query error in purchase requests:', queryError);
      
      // Try a simpler query if the main one fails
      try {
        console.log('Attempting simplified query without complex filters');
        // Fallback to just organization ID without other filters
        const basicFilter = { organizationId: filter.organizationId };
        const basicRequests = await PurchaseRequest.find(basicFilter)
          .populate('productId', 'name sku price images category')
          .populate('clientId', 'name email company')
          .sort({ createdAt: -1 })
          .limit(50);
        
        console.log(`Found ${basicRequests.length} purchase requests with simplified query`);
        res.json(basicRequests);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        res.status(500).json({ 
          message: 'Database error when fetching purchase requests',
          error: fallbackError.message
        });
      }
    }
  } catch (err) {
    console.error('Error fetching purchase requests:', err);
    res.status(500).json({ 
      message: 'Server error processing purchase requests',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route    GET /api/products/purchase-requests/client
// @desc     Get purchase requests for a specific client
// @access   Private (Client)
router.get('/purchase-requests/client', authMiddleware, async (req, res) => {
  try {
    console.log('Client purchase requests endpoint accessed by user:', req.user.id, 'Role:', req.user.role);
    
    // Get the client ID from query parameter first, then fall back to authenticated user
    const clientId = req.query.clientId || req.user.id;
    console.log('Requested client ID:', clientId);
    
    if (!clientId) {
      console.error('No client ID provided');
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    // If admin is requesting client data, allow it
    const isAdminRequestingClientData = 
      (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'client_admin') && 
      req.query.clientId;
    
    // If not admin and trying to access another client's data, deny access
    if (!isAdminRequestingClientData && clientId !== req.user.id) {
      console.error(`Unauthorized access: User ${req.user.id} trying to access client ${clientId} data`);
      return res.status(403).json({ message: 'Not authorized to view these purchase requests' });
    }

    // Get all purchase requests for this client with more detailed logging
    console.log(`Searching for purchase requests with clientId: ${clientId}`);
    
    try {
      const requests = await PurchaseRequest.find({ clientId })
        .populate('productId', 'name sku price images category')
        .populate('clientId', 'name email company')
        .sort({ createdAt: -1 });
  
      console.log(`Found ${requests.length} purchase requests for client ${clientId}`);
      res.json(requests);
    } catch (queryErr) {
      console.error('Database query error:', queryErr);
      res.status(500).json({ message: 'Database error when fetching purchase requests' });
    }
  } catch (err) {
    console.error('Error fetching client purchase requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/products/purchase-requests/:id
// @desc     Get a specific purchase request
// @access   Private
router.get('/purchase-requests/:id', authMiddleware, async (req, res) => {
  try {
    const request = await PurchaseRequest.findById(req.params.id)
      .populate('productId', 'name sku price images category')
      .populate('clientId', 'name email company');

    if (!request) {
      return res.status(404).json({ message: 'Purchase request not found' });
    }

    // Check if the user has permission to view this request (admin or the client who created it)
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'superadmin' && 
      req.user.role !== 'client_admin' && 
      request.clientId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to view this purchase request' });
    }

    res.json(request);
  } catch (err) {
    console.error('Error fetching purchase request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/products/purchase-requests/:id/approve
// @desc     Approve a purchase request
// @access   Private (Admin)
router.post('/purchase-requests/:id/approve', authMiddleware, async (req, res) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log(`[APPROVE] Processing approval for purchase request: ${req.params.id}`);
    
    // Validate request ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(`[APPROVE] Invalid purchase request ID: ${req.params.id}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid purchase request ID format' });
    }
    
    // 1. Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // 2. Find the purchase request
    let request;
    try {
      request = await PurchaseRequest.findById(req.params.id).session(session)
        .populate('productId', 'name sku price stock images category reorderLevel')
        .populate('clientId', 'name email company');
        
      if (!request) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Purchase request not found' });
      }
    } catch (findError) {
      console.error(`[APPROVE] Error finding purchase request: ${findError.message}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ 
        message: 'Error loading purchase request data',
        error: findError.message
      });
    }

    // 3. Verify request is pending
    if (request.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: `Purchase request cannot be approved. Current status: ${request.status}` 
      });
    }

    // 4. Find admin product
    let adminProduct;
    try {
      adminProduct = request.productId && typeof request.productId === 'object' 
        ? request.productId 
        : await Product.findById(request.productId).session(session);
        
      if (!adminProduct) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Admin product not found' });
      }
    } catch (productError) {
      console.error(`[APPROVE] Error finding admin product: ${productError.message}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ 
        message: 'Error loading admin product data',
        error: productError.message
      });
    }

    console.log(`[APPROVE] Found admin product:`, {
      id: adminProduct._id,
      name: adminProduct.name,
      stock: adminProduct.stock
    });

    // 5. Check stock availability
    if (adminProduct.stock < request.quantity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Not enough stock available', 
        available: adminProduct.stock, 
        requested: request.quantity 
      });
    }

    // 6. Get client ID (handle both string ID and object reference)
    let clientId;
    let clientObjectId;
    
    try {
      if (typeof request.clientId === 'object') {
        clientId = request.clientId._id || request.clientId.id;
        console.log(`[APPROVE] ClientId is an object, extracted ID: ${clientId}`);
      } else {
        clientId = request.clientId;
        console.log(`[APPROVE] ClientId is already a string/primitive: ${clientId}`);
      }
      
      // Ensure clientId is a proper ObjectId if possible
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        clientObjectId = new mongoose.Types.ObjectId(clientId);
        console.log(`[APPROVE] Converted clientId to ObjectId: ${clientObjectId}`);
      } else {
        clientObjectId = clientId;
        console.log(`[APPROVE] ClientId is not a valid ObjectId: ${clientId}`);
      }
    } catch (clientIdError) {
      console.error(`[APPROVE] Error processing client ID: ${clientIdError.message}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ 
        message: 'Error processing client identification',
        error: clientIdError.message
      });
    }
    
    // Check if admin is approving their own request - with safe null checks
    let isAdminSelfApproval = false;
    try {
      if (req.user && req.user._id && clientId) {
        const adminIdStr = req.user._id.toString();
        const clientIdStr = clientId.toString();
        isAdminSelfApproval = adminIdStr === clientIdStr;
        console.log(`[APPROVE] Admin self approval check: ${isAdminSelfApproval}`);
        console.log(`[APPROVE] User ID: ${adminIdStr}, Client ID: ${clientIdStr}`);
      }
    } catch (compareError) {
      console.error(`[APPROVE] Error during self-approval check:`, compareError);
      // Continue with isAdminSelfApproval as false
    }
    
    // For admin self-approval, use the admin's own ID for the client product
    let effectiveClientId;
    if (isAdminSelfApproval && req.user && req.user._id) {
      effectiveClientId = req.user._id;
      console.log(`[APPROVE] Using admin's own ID for client product: ${effectiveClientId}`);
    } else {
      effectiveClientId = clientObjectId || clientId;
      console.log(`[APPROVE] Using original client ID: ${effectiveClientId}`);
    }

    // 7. Find or create client product based on the admin product
    
    // Make sure we have a valid product name and client ID before querying
    if (!adminProduct.name || !effectiveClientId) {
      console.error(`[APPROVE] Missing required data: productName=${adminProduct.name}, effectiveClientId=${effectiveClientId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Missing required data for client product lookup',
        details: {
          productName: adminProduct.name ? 'Valid' : 'Missing',
          clientId: effectiveClientId ? 'Valid' : 'Missing'
        }
      });
    }
    
    let clientProduct = await Product.findOne({
      name: adminProduct.name,
      createdBy: effectiveClientId
    }).session(session);

    // If client product doesn't exist, create one
    const isNewClientProduct = !clientProduct;
    
    try {
      if (isNewClientProduct) {
        console.log(`[APPROVE] Creating new client product`);
        
        // Generate a unique SKU with timestamp
        const uniqueSuffix = Date.now().toString().substring(8) + Math.floor(Math.random() * 10000);
        const clientSku = `CLIENT-${adminProduct.sku || 'PROD'}-${uniqueSuffix}`;
        
        clientProduct = new Product({
          name: adminProduct.name,
          description: adminProduct.description,
          sku: clientSku,
          category: adminProduct.category,
          price: adminProduct.price,
          loyaltyPoints: adminProduct.loyaltyPoints,
          stock: request.quantity,
          isClientUploaded: true,
          createdBy: effectiveClientId,
          organizationId: request.organizationId || adminProduct.organizationId,
          images: adminProduct.images,
          specifications: adminProduct.specifications,
          status: 'active',
          clientInventory: {
            initialStock: request.quantity,
            currentStock: request.quantity,
            reorderLevel: adminProduct.reorderLevel || 5,
            lastUpdated: new Date()
          }
        });
      } else {
        console.log(`[APPROVE] Updating existing client product`);
        
        // Update stock for existing client product
        if (!clientProduct.clientInventory) {
          clientProduct.clientInventory = {
            initialStock: clientProduct.stock || 0,
            currentStock: (clientProduct.stock || 0) + request.quantity,
            reorderLevel: adminProduct.reorderLevel || 5,
            lastUpdated: new Date()
          };
        } else {
          clientProduct.clientInventory.currentStock += request.quantity;
          clientProduct.clientInventory.lastUpdated = new Date();
        }
        
        // Also update regular stock
        clientProduct.stock = (clientProduct.stock || 0) + request.quantity;
      }
    } catch (productCreationError) {
      console.error('[APPROVE] Error creating/updating client product:', productCreationError);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        message: 'Failed to create or update client product',
        error: productCreationError.message
      });
    }

    try {
      // 8. Save client product
      await clientProduct.save({ session });
      console.log(`[APPROVE] Client product saved, ID: ${clientProduct._id}`);
      
      // 9. Decrease admin product stock
      const previousStock = adminProduct.stock;
      adminProduct.stock -= request.quantity;
      await adminProduct.save({ session });
      console.log(`[APPROVE] Admin product stock updated: ${previousStock} -> ${adminProduct.stock}`);
      
      // 10. Create inventory transaction record
      try {
        const transaction = new InventoryTransaction({
          transactionType: 'client_allocation',
          productId: adminProduct._id,
          quantity: request.quantity,
          previousQuantity: previousStock,
          newQuantity: adminProduct.stock,
          userId: req.user._id,
          clientId: clientId,
          purchaseRequestId: request._id,
          notes: `Stock allocation from purchase request ${request._id}${isAdminSelfApproval ? ' (admin self-approval)' : ''}`
        });
        
        await transaction.save({ session });
        console.log(`[APPROVE] Inventory transaction recorded, ID: ${transaction._id}`);
      } catch (transactionError) {
        console.error('[APPROVE] Error creating transaction record:', transactionError);
        // Continue with request approval even if transaction record fails
      }
      
      // 11. Update purchase request status
      request.status = 'approved';
      await request.save({ session });
      console.log(`[APPROVE] Request status updated to approved`);
      
      // 12. Create notification for client
      try {
        const Notification = mongoose.model('Notification');
        await Notification.create({
          recipient: clientId,
          sender: req.user._id,
          type: 'purchase_request_approved',
          title: 'Purchase Request Approved',
          message: `Your request for ${request.quantity} ${adminProduct.name} has been approved`,
          read: false,
          channels: ['app'],
          relatedId: request._id,
          relatedModel: 'PurchaseRequest',
          metadata: {
            productId: adminProduct._id,
            productName: adminProduct.name,
            quantity: request.quantity
          },
          priority: 'medium'
        });
        console.log(`[APPROVE] Notification created for client ${clientId}`);
      } catch (notificationError) {
        console.error('[APPROVE] Error creating notification:', notificationError);
        // Continue even if notification fails
      }
      
      // 13. Commit the transaction
      await session.commitTransaction();
      
      // 14. Send successful response
      console.log(`[APPROVE] Purchase request approved successfully`);
      res.json({
        message: 'Purchase request approved successfully',
        request: {
          id: request._id,
          status: request.status,
          quantity: request.quantity
        },
        adminProduct: {
          id: adminProduct._id,
          name: adminProduct.name,
          previousStock: previousStock,
          newStock: adminProduct.stock
        },
        clientProduct: {
          id: clientProduct._id,
          name: clientProduct.name,
          stock: clientProduct.clientInventory?.currentStock,
          isNew: isNewClientProduct
        },
        isAdminSelfApproval: isAdminSelfApproval
      });
    } catch (saveError) {
      console.error(`[APPROVE] Error saving changes:`, saveError);
      await session.abortTransaction();
      return res.status(500).json({
        message: 'Failed to update inventory during approval',
        error: saveError.message
      });
    }
  } catch (err) {
    console.error('Error in purchase request approval process:', err);
    await session.abortTransaction();
    res.status(500).json({ 
      message: 'Server error during approval process', 
      error: err.message 
    });
  } finally {
    session.endSession();
  }
});

// @route    POST /api/products/purchase-requests/:id/reject
// @desc     Reject a purchase request
// @access   Private (Admin)
router.post('/purchase-requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    // Check user role - only allow admin and superadmin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Validate rejection reason
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    // Find the purchase request
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Purchase request not found' });
    }

    // Check if the request is already approved or rejected
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Purchase request cannot be rejected. Current status: ${request.status}` 
      });
    }

    // Update the purchase request
    request.status = 'rejected';
    request.rejectionReason = reason;
    await request.save();

    res.json({ 
      message: 'Purchase request rejected successfully',
      request
    });
  } catch (err) {
    console.error('Error rejecting purchase request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/products/purchase-requests/:id/reliable-approve
// @desc     Reliably approve a purchase request with better inventory handling
// @access   Private (Admin)
router.post('/purchase-requests/:id/reliable-approve', authMiddleware, async (req, res) => {
  try {
    console.log(`[RELIABLE-APPROVE] Processing approval for purchase request: ${req.params.id}`);
    
    // Validate request ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(`[RELIABLE-APPROVE] Invalid purchase request ID: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid purchase request ID format' });
    }
    
    // 1. Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // 2. Find the purchase request and fully populate references
    let request;
    try {
      request = await PurchaseRequest.findById(req.params.id)
        .populate('productId', 'name sku price stock images category reorderLevel')
        .populate('clientId', 'name email company');
        
      if (!request) {
        return res.status(404).json({ message: 'Purchase request not found' });
      }
    } catch (findError) {
      console.error(`[RELIABLE-APPROVE] Error finding purchase request: ${findError.message}`);
      return res.status(500).json({ 
        message: 'Error loading purchase request data',
        error: findError.message
      });
    }
    
    console.log(`[RELIABLE-APPROVE] Found request:`, {
      id: request._id,
      clientId: request.clientId?._id || request.clientId,
      clientName: request.clientName || (request.clientId?.name),
      productId: request.productId?._id || request.productId,
      productName: request.productName || (request.productId?.name),
      quantity: request.quantity
    });

    // 3. Verify request is pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Purchase request cannot be approved. Current status: ${request.status}` 
      });
    }

    // 4. Find admin product
    let adminProduct;
    try {
      adminProduct = request.productId && typeof request.productId === 'object' 
        ? request.productId 
        : await Product.findById(request.productId);
        
      if (!adminProduct) {
        return res.status(404).json({ message: 'Admin product not found' });
      }
    } catch (productError) {
      console.error(`[RELIABLE-APPROVE] Error finding admin product: ${productError.message}`);
      return res.status(500).json({ 
        message: 'Error loading admin product data',
        error: productError.message
      });
    }
    
    console.log(`[RELIABLE-APPROVE] Found admin product:`, {
      id: adminProduct._id,
      name: adminProduct.name,
      stock: adminProduct.stock
    });

    // 5. Check stock availability
    if (adminProduct.stock < request.quantity) {
      return res.status(400).json({ 
        message: 'Not enough stock available', 
        available: adminProduct.stock, 
        requested: request.quantity 
      });
    }

    // 6. Get client ID (handle both string ID and object reference)
    let clientId;
    let clientObjectId;
    
    try {
      if (typeof request.clientId === 'object') {
        clientId = request.clientId._id || request.clientId.id;
        console.log(`[RELIABLE-APPROVE] ClientId is an object, extracted ID: ${clientId}`);
      } else {
        clientId = request.clientId;
        console.log(`[RELIABLE-APPROVE] ClientId is already a string/primitive: ${clientId}`);
      }
      
      // Ensure clientId is a proper ObjectId if possible
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        clientObjectId = new mongoose.Types.ObjectId(clientId);
        console.log(`[RELIABLE-APPROVE] Converted clientId to ObjectId: ${clientObjectId}`);
      } else {
        clientObjectId = clientId;
        console.log(`[RELIABLE-APPROVE] ClientId is not a valid ObjectId: ${clientId}`);
      }
    } catch (clientIdError) {
      console.error(`[RELIABLE-APPROVE] Error processing client ID: ${clientIdError.message}`);
      return res.status(500).json({ 
        message: 'Error processing client identification',
        error: clientIdError.message
      });
    }
    
    // Check if admin is approving their own request - with safe null checks
    let isAdminSelfApproval = false;
    try {
      if (req.user && req.user._id && clientId) {
        const adminIdStr = req.user._id.toString();
        const clientIdStr = clientId.toString();
        isAdminSelfApproval = adminIdStr === clientIdStr;
        console.log(`[RELIABLE-APPROVE] Admin self approval check: ${isAdminSelfApproval}`);
        console.log(`[RELIABLE-APPROVE] User ID: ${adminIdStr}, Client ID: ${clientIdStr}`);
      }
    } catch (compareError) {
      console.error(`[RELIABLE-APPROVE] Error during self-approval check:`, compareError);
      // Continue with isAdminSelfApproval as false
    }

    // For admin self-approval, use the admin's own ID for the client product
    let effectiveClientId;
    if (isAdminSelfApproval && req.user && req.user._id) {
      effectiveClientId = req.user._id;
      console.log(`[RELIABLE-APPROVE] Using admin's own ID for client product: ${effectiveClientId}`);
    } else {
      effectiveClientId = clientObjectId || clientId;
      console.log(`[RELIABLE-APPROVE] Using original client ID: ${effectiveClientId}`);
    }
    
    console.log(`[RELIABLE-APPROVE] Final clientId values for lookup:`, {
      originalClientId: request.clientId,
      extractedClientId: clientId,
      convertedObjectId: clientObjectId,
      clientIdType: typeof clientId,
      isValidObjectId: mongoose.Types.ObjectId.isValid(clientId),
      isAdminSelfApproval: isAdminSelfApproval,
      effectiveClientId: effectiveClientId
    });

    // 7. Find or create client product
    console.log(`[RELIABLE-APPROVE] Searching for existing client product with name "${adminProduct.name}" and clientId "${effectiveClientId}"`);
    
    // Make sure we have a valid product name and client ID before querying
    if (!adminProduct.name || !effectiveClientId) {
      console.error(`[RELIABLE-APPROVE] Missing required data: productName=${adminProduct.name}, effectiveClientId=${effectiveClientId}`);
      return res.status(400).json({ 
        message: 'Missing required data for client product lookup',
        details: {
          productName: adminProduct.name ? 'Valid' : 'Missing',
          clientId: effectiveClientId ? 'Valid' : 'Missing'
        }
      });
    }
    
    // Try different queries to find an existing client product
    let clientProductQueries = [
      // Query 1: Simple match by name and createdBy with effective client ID
      { 
        name: adminProduct.name, 
        createdBy: effectiveClientId 
      },
      // Query 2: Match by name and clientInventory with effective client ID
      { 
        name: adminProduct.name, 
        'clientInventory.initialStock': { $exists: true }, 
        createdBy: effectiveClientId 
      }
    ];
    
    // Try each query until we find a match
    let clientProduct = null;
    let queryIndex = 0;
    
    for (const query of clientProductQueries) {
      queryIndex++;
      console.log(`[RELIABLE-APPROVE] Trying query #${queryIndex}:`, JSON.stringify(query));
      
      try {
        clientProduct = await Product.findOne(query);
        if (clientProduct) {
          console.log(`[RELIABLE-APPROVE] Found existing client product with query #${queryIndex}`);
          break;
        }
      } catch (err) {
        console.error(`[RELIABLE-APPROVE] Error in query #${queryIndex}:`, err.message);
      }
    }
    
    // Log whether we found an existing product
    if (clientProduct) {
      console.log(`[RELIABLE-APPROVE] Found existing client product:`, {
        id: clientProduct._id,
        name: clientProduct.name,
        createdBy: clientProduct.createdBy,
        clientInventory: clientProduct.clientInventory || 'No client inventory'
      });
    } else {
      console.log(`[RELIABLE-APPROVE] No existing client product found after ${queryIndex} queries`);
    }
    
    let isNewClientProduct = false;
    
    try {
      // If client product doesn't exist, create one
      if (!clientProduct) {
        console.log(`[RELIABLE-APPROVE] Creating new client product for client ${effectiveClientId}`);
        isNewClientProduct = true;
        
        // Generate a unique SKU with timestamp
        const uniqueSuffix = Date.now().toString().substring(8) + Math.floor(Math.random() * 10000);
        const clientSku = `CLIENT-${adminProduct.sku || 'PROD'}-${uniqueSuffix}`;
        
        // Copy more properties from admin product to ensure complete data
        clientProduct = new Product({
          name: adminProduct.name,
          description: adminProduct.description,
          sku: clientSku,
          category: adminProduct.category,
          price: adminProduct.price,
          loyaltyPoints: adminProduct.loyaltyPoints,
          stock: request.quantity, // Set regular stock as well for clients that might use it
          isClientUploaded: true,
          createdBy: effectiveClientId, // Use effective client ID
          organizationId: request.organizationId || adminProduct.organizationId,
          images: adminProduct.images || [],
          specifications: adminProduct.specifications || [],
          status: 'active',
          clientInventory: {
            initialStock: request.quantity,
            currentStock: request.quantity,
            reorderLevel: adminProduct.reorderLevel || 5,
            lastUpdated: new Date()
          }
        });
        
        console.log(`[RELIABLE-APPROVE] Created new client product:`, {
          id: clientProduct._id,
          name: clientProduct.name,
          createdBy: clientProduct.createdBy,
          clientInventory: clientProduct.clientInventory,
          stock: clientProduct.stock
        });
      } else {
        // Update existing client product inventory
        console.log(`[RELIABLE-APPROVE] Updating existing client product: ${clientProduct._id}`);
        console.log(`Current stock: ${clientProduct.clientInventory?.currentStock || 0}, Adding: ${request.quantity}`);
        
        // Ensure clientInventory object exists
        if (!clientProduct.clientInventory) {
          clientProduct.clientInventory = {
            initialStock: request.quantity,
            currentStock: request.quantity,
            reorderLevel: adminProduct.reorderLevel || 5,
            lastUpdated: new Date()
          };
        } else {
          // Update existing inventory values
          clientProduct.clientInventory.currentStock = (clientProduct.clientInventory.currentStock || 0) + request.quantity;
          clientProduct.clientInventory.lastUpdated = new Date();
        }
        
        // Also update regular stock field for consistency and proper display in client inventory
        clientProduct.stock = (clientProduct.stock || 0) + request.quantity;
        console.log(`[RELIABLE-APPROVE] Updated client regular stock field to: ${clientProduct.stock}`);
        console.log(`[RELIABLE-APPROVE] Updated client stock to: ${clientProduct.stock}`);
      }
    } catch (productCreationError) {
      console.error('[RELIABLE-APPROVE] Error creating/updating client product:', productCreationError);
      return res.status(500).json({
        message: 'Failed to create or update client product',
        error: productCreationError.message
      });
    }

    // 8. Make all database updates in sequence with explicit error handling
    try {
      // Step 1: Save client product (add stock to client)
      const savedClientProduct = await clientProduct.save();
      console.log(`[RELIABLE-APPROVE] Client product saved, ID: ${savedClientProduct._id}, new stock: ${savedClientProduct.clientInventory?.currentStock}`);
      
      // Step 2: Update admin product (reduce stock from admin)
      const previousAdminStock = adminProduct.stock;
      adminProduct.stock -= request.quantity;
      const savedAdminProduct = await adminProduct.save();
      console.log(`[RELIABLE-APPROVE] Admin product stock updated: ${previousAdminStock} -> ${savedAdminProduct.stock}`);
      
      // Step 3: Create inventory transaction record
      let transaction;
      try {
        transaction = new InventoryTransaction({
          transactionType: 'client_allocation',
          productId: adminProduct._id,
          quantity: request.quantity,
          previousQuantity: previousAdminStock,
          newQuantity: adminProduct.stock,
          userId: req.user._id,
          clientId: clientId,
          purchaseRequestId: request._id,
          notes: `Stock allocation from purchase request ${request._id}${isAdminSelfApproval ? ' (admin self-approval)' : ''}`
        });
        
        await transaction.save();
        console.log(`[RELIABLE-APPROVE] Inventory transaction recorded, ID: ${transaction._id}`);
      } catch (transactionError) {
        console.error('[RELIABLE-APPROVE] Error creating transaction record:', transactionError);
        // Continue with request approval even if transaction record fails
      }
      
      // Step 4: Update purchase request status
      request.status = 'approved';
      const savedRequest = await request.save();
      console.log(`[RELIABLE-APPROVE] Purchase request status updated to approved, ID: ${savedRequest._id}`);
      
      // Step 5: Create notification for the client
      try {
        const Notification = mongoose.model('Notification');
        await Notification.create({
          recipient: clientId,
          sender: req.user._id,
          type: 'purchase_request_approved',
          title: 'Purchase Request Approved',
          message: `Your request for ${request.quantity} ${adminProduct.name} has been approved`,
          read: false,
          channels: ['app'],
          relatedId: request._id,
          relatedModel: 'PurchaseRequest',
          metadata: {
            productId: adminProduct._id,
            productName: adminProduct.name,
            quantity: request.quantity
          },
          priority: 'medium'
        });
        console.log(`[RELIABLE-APPROVE] Notification created for client ${clientId}`);
      } catch (notificationError) {
        console.error('[RELIABLE-APPROVE] Error creating notification:', notificationError);
        // Continue even if notification fails
      }
      
      // 9. Send success response with detailed information
      res.json({
        message: 'Purchase request approved successfully',
        request: {
          id: savedRequest._id,
          status: savedRequest.status,
          quantity: savedRequest.quantity
        },
        adminProduct: {
          id: savedAdminProduct._id,
          name: savedAdminProduct.name,
          previousStock: previousAdminStock,
          newStock: savedAdminProduct.stock
        },
        clientProduct: {
          id: savedClientProduct._id,
          name: savedClientProduct.name,
          stock: savedClientProduct.clientInventory?.currentStock,
          isNew: isNewClientProduct
        },
        isAdminSelfApproval: isAdminSelfApproval
      });
    } catch (dbError) {
      console.error('[RELIABLE-APPROVE] Database operation failed:', dbError);
      return res.status(500).json({
        message: 'Failed to update inventory during approval',
        error: dbError.message,
        stage: dbError.clientProduct ? 'updating_admin_product' : 
              dbError.adminProduct ? 'updating_request_status' : 'saving_client_product'
      });
    }
  } catch (err) {
    console.error('[RELIABLE-APPROVE] Error:', err);
    res.status(500).json({ 
      message: 'Server error during purchase request approval',
      error: err.message
    });
  }
});

// @route    GET /api/products/categories/list
// @desc     Get all unique product categories
// @access   Private
router.get('/categories/list', authMiddleware, async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories.filter(Boolean)); // Filter out null/empty categories
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/products/debug-client-inventory
// @desc     Debug endpoint to directly fetch client inventory data
// @access   Private
router.get('/debug-client-inventory', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    console.log(`[DEBUG] Fetching inventory data for client: ${clientId}`);
    
    // Get client's products with clientInventory data
    const clientProducts = await Product.find({
      createdBy: clientId,
      isClientUploaded: true
    });
    
    console.log(`[DEBUG] Found ${clientProducts.length} client products`);
    
    // Get client's approved purchase requests
    const approvedRequests = await PurchaseRequest.find({
      clientId,
      status: 'approved'
    })
    .populate('productId', 'name sku price images category')
    .sort({ updatedAt: -1 });
    
    console.log(`[DEBUG] Found ${approvedRequests.length} approved purchase requests`);
    
    // Return debug information
    res.json({
      success: true,
      clientId,
      clientProducts: clientProducts.length,
      approvedRequests: approvedRequests.length,
      products: clientProducts.map(item => ({
        id: item._id,
        productId: item._id,
        productName: item.name || 'Unknown Product',
        currentQuantity: item.clientInventory?.currentStock || item.stock || 0,
        allocatedQuantity: item.clientInventory?.initialStock || item.stock || 0,
        lastUpdated: item.updatedAt
      })),
      requests: approvedRequests.map(req => ({
        id: req._id,
        productId: req.productId?._id,
        productName: req.productName || req.productId?.name,
        quantity: req.quantity,
        approvedDate: req.updatedAt
      }))
    });
  } catch (err) {
    console.error('Error in debug-client-inventory:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route    POST /api/products/repair-client-inventory
// @desc     Repair client inventory by syncing with approved purchase requests
// @access   Private
router.post('/repair-client-inventory', authMiddleware, async (req, res) => {
  try {
    const { clientId, forceRebuild } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }
    
    console.log(`[REPAIR] Repairing inventory for client: ${clientId}, forceRebuild: ${forceRebuild}`);
    
    // If force rebuild is enabled, delete all existing client inventory records
    if (forceRebuild) {
      console.log(`[REPAIR] Force rebuild enabled, deleting existing inventory records`);
      await ClientInventory.deleteMany({ clientId });
    }
    
    // Get all approved purchase requests for this client
    const approvedRequests = await PurchaseRequest.find({
      clientId,
      status: 'approved'
    })
    .populate('productId', 'name sku price images category reorderLevel')
    .sort({ updatedAt: 1 }); // Process oldest first
    
    console.log(`[REPAIR] Found ${approvedRequests.length} approved purchase requests to process`);
    
    // Process each approved request
    const results = [];
    
    for (const request of approvedRequests) {
      try {
        // Skip if product doesn't exist
        if (!request.productId) {
          console.log(`[REPAIR] Skipping request ${request._id} - product not found`);
          results.push({
            requestId: request._id,
            status: 'skipped',
            reason: 'Product not found'
          });
          continue;
        }
        
        // Find or create client inventory record
        let clientInventory = await ClientInventory.findOne({
          clientId,
          productId: request.productId._id
        });
        
        let isNew = false;
        
        if (!clientInventory) {
          console.log(`[REPAIR] Creating new inventory record for product ${request.productId.name}`);
          isNew = true;
          
          clientInventory = new ClientInventory({
            clientId,
            productId: request.productId._id,
            allocatedQuantity: request.quantity,
            currentQuantity: request.quantity,
            reorderLevel: request.productId.reorderLevel || 5,
            purchaseDate: request.updatedAt || request.createdAt,
            purchaseRequestId: request._id,
            notes: `Repaired allocation from purchase request ${request._id}`
          });
        } else if (forceRebuild) {
          // If rebuilding, add to existing quantities
          console.log(`[REPAIR] Updating existing inventory record for ${request.productId.name}`);
          clientInventory.allocatedQuantity += request.quantity;
          clientInventory.currentQuantity += request.quantity;
        } else {
          // If not rebuilding and record exists, skip
          console.log(`[REPAIR] Inventory record already exists for ${request.productId.name}, skipping`);
          results.push({
            requestId: request._id,
            inventoryId: clientInventory._id,
            status: 'skipped',
            reason: 'Inventory record already exists'
          });
          continue;
        }
        
        // Add history entry
        clientInventory.addHistoryEntry(
          'allocation',
          request.quantity,
          null, // No user ID for system repair
          `Repair allocation from purchase request ${request._id}`
        );
        
        // Save the inventory record
        await clientInventory.save();
        
        results.push({
          requestId: request._id,
          inventoryId: clientInventory._id,
          status: 'success',
          isNew,
          quantity: request.quantity
        });
      } catch (itemError) {
        console.error(`[REPAIR] Error processing request ${request._id}:`, itemError);
        results.push({
          requestId: request._id,
          status: 'error',
          error: itemError.message
        });
      }
    }
    
    // Return repair results
    res.json({
      success: true,
      clientId,
      processed: approvedRequests.length,
      results
    });
  } catch (err) {
    console.error('Error in repair-client-inventory:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// @route    GET /api/products/:id
// @desc     Get a product by ID
// @access   Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/products
// @desc     Create a new product
// @access   Private
router.post('/', 
  [
  authMiddleware,
    [
  check('name', 'Name is required').not().isEmpty(),
  check('price', 'Price must be a positive number').isFloat({ min: 0 }),
  check('sku', 'SKU is required').not().isEmpty()
    ]
  ], 
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

    try {
      console.log('Creating product with data:', req.body);
      
      // Create new product
    const newProduct = new Product({
        ...req.body,
      createdBy: req.user.id,
        organizationId: req.user.organizationId || req.body.organizationId
      });
      
      // Special handling for client-uploaded products with initial inventory
      if (req.body.isClientUploaded && req.body.initialInventory > 0) {
        // Set up clientInventory with initialInventory as the starting stock
      newProduct.clientInventory = {
          initialStock: req.body.initialInventory,
          currentStock: req.body.initialInventory,
          reorderLevel: req.body.reorderLevel || 5,
        lastUpdated: new Date()
      };
    }

      // Save the product
      await newProduct.save();
      
      res.status(201).json(newProduct);
    } catch (err) {
      console.error('Error creating product:', err);
      
      // Handle duplicate SKU error
      if (err.code === 11000) {
        return res.status(400).json({ message: 'A product with this SKU already exists' });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
});

// @route    PATCH /api/products/:id/inventory
// @desc     Update product inventory (stock, reorderLevel, reservedStock)
// @access   Private
router.patch('/:id/inventory', authMiddleware, async (req, res) => {
  try {
    const { stock, reorderLevel, reservedStock } = req.body;
    
    console.log(`[INVENTORY UPDATE] Request for product ${req.params.id}:`, req.body);
    
    // Extra validation to ensure we have a valid ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(`[ERROR] Invalid product ID: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    // Validate inputs
    if (
      (stock !== undefined && (isNaN(stock) || stock < 0)) ||
      (reorderLevel !== undefined && (isNaN(reorderLevel) || reorderLevel < 0)) ||
      (reservedStock !== undefined && (isNaN(reservedStock) || reservedStock < 0))
    ) {
      console.error(`[ERROR] Invalid inventory values:`, req.body);
      return res.status(400).json({ message: 'Invalid inventory values. Must be non-negative numbers.' });
    }
    
    // Convert values to numbers explicitly to ensure they're saved as numbers
    const updateData = {};
    if (stock !== undefined) updateData.stock = Number(stock);
    if (reorderLevel !== undefined) updateData.reorderLevel = Number(reorderLevel);
    if (reservedStock !== undefined) updateData.reservedStock = Number(reservedStock);
    updateData.updatedAt = new Date();
    
    console.log('[INVENTORY UPDATE] Update data after conversion:', updateData);
    
    // First find the product
    const productBefore = await Product.findById(req.params.id);
    if (!productBefore) {
      console.error(`[ERROR] Product not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('[INVENTORY UPDATE] Product before update:', {
      id: productBefore._id,
      name: productBefore.name, 
      stock: productBefore.stock,
      reorderLevel: productBefore.reorderLevel,
      reservedStock: productBefore.reservedStock
    });
    
    // Apply updates directly to the found document and save it
    Object.assign(productBefore, updateData);
    
    // Save the updated product
    const savedProduct = await productBefore.save();
    
    console.log('[INVENTORY UPDATE] Product after update:', {
      id: savedProduct._id,
      name: savedProduct.name,
      stock: savedProduct.stock,
      reorderLevel: savedProduct.reorderLevel,
      reservedStock: savedProduct.reservedStock
    });
    
    // Return the updated product
    res.json(savedProduct);
  } catch (err) {
    console.error('[ERROR] Error updating product inventory:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route    PATCH /api/products/:id/client-inventory
// @desc     Update client-specific inventory for a product
// @access   Private
router.patch('/:id/client-inventory', authMiddleware, async (req, res) => {
  try {
    const { currentStock, reorderLevel } = req.body;
    
    // Validate inputs
    if (
      (currentStock !== undefined && (isNaN(currentStock) || currentStock < 0)) ||
      (reorderLevel !== undefined && (isNaN(reorderLevel) || reorderLevel < 0))
    ) {
      return res.status(400).json({ message: 'Invalid inventory values. Must be non-negative numbers.' });
    }
    
    // Find the product
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update client inventory
    product.clientInventory = {
      initialStock: product.clientInventory?.initialStock || currentStock,
      currentStock: currentStock !== undefined ? currentStock : product.clientInventory?.currentStock || 0,
      reorderLevel: reorderLevel !== undefined ? reorderLevel : product.clientInventory?.reorderLevel || 5,
      lastUpdated: new Date()
    };
    
    // Make sure isClientUploaded flag is set if we have client inventory
    if (!product.isClientUploaded) {
      product.isClientUploaded = true;
    }
    
    // Save the updated product
    await product.save();
    
    res.json({ 
      message: 'Client inventory updated successfully',
      product
    });
  } catch (err) {
    console.error('Error updating client inventory:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/products/:id
// @desc     Update a product
// @access   Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Remove fields that shouldn't be updated directly
    const updates = { ...req.body };
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    
    // Update product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    DELETE /api/products/:id
// @desc     Delete a product
// @access   Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has permission to delete the product
    if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    
    await product.deleteOne();
    
    res.json({ message: 'Product removed' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/products/purchase-requests/:id/check
// @desc     Diagnose a purchase request before approval
// @access   Private (Admin)
router.get('/purchase-requests/:id/check', authMiddleware, async (req, res) => {
  try {
    // Check user role - only allow admin and superadmin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Find the purchase request and fully populate its references
    const request = await PurchaseRequest.findById(req.params.id)
      .populate('productId', 'name sku price stock images category reorderLevel')
      .populate('clientId', 'name email company');
      
    if (!request) {
      return res.status(404).json({ message: 'Purchase request not found' });
    }

    // Find the admin product (should already be populated, but double-check)
    const adminProduct = request.productId && typeof request.productId === 'object' 
      ? request.productId 
      : await Product.findById(request.productId);
    
    // Find if the client already has this product in their inventory
    const clientProduct = await Product.findOne({
      name: adminProduct?.name,
      'clientInventory.initialStock': { $exists: true },
      createdBy: request.clientId
    });

    // Check for potential issues
    const issues = [];
    
    if (!adminProduct) {
      issues.push('Product not found');
    } else if (adminProduct.stock < request.quantity) {
      issues.push(`Insufficient stock (Available: ${adminProduct.stock}, Requested: ${request.quantity})`);
    }
    
    if (request.status !== 'pending') {
      issues.push(`Request already processed (Status: ${request.status})`);
    }
    
    // Prepare diagnostic info
    const diagnosticInfo = {
      request: {
        id: request._id,
        productId: request.productId,
        productName: request.productName || (adminProduct && adminProduct.name) || 'Unknown Product',
        clientId: request.clientId,
        clientName: request.clientName || (request.clientId && typeof request.clientId === 'object' && request.clientId.name) || 'Unknown Client',
        quantity: request.quantity,
        price: request.price,
        status: request.status,
        createdAt: request.createdAt
      },
      adminProduct: adminProduct ? {
        id: adminProduct._id,
        name: adminProduct.name,
        sku: adminProduct.sku,
        currentStock: adminProduct.stock,
        sufficientStock: adminProduct.stock >= request.quantity
      } : null,
      clientProduct: clientProduct ? {
        id: clientProduct._id,
        name: clientProduct.name,
        sku: clientProduct.sku,
        currentStock: clientProduct.clientInventory?.currentStock || 0
      } : 'No existing client product found',
      issues: issues,
      canApprove: issues.length === 0
    };

    res.json({
      message: issues.length === 0 ? 'Purchase request ready for approval' : 'Issues found with purchase request',
      diagnosticInfo
    });
  } catch (err) {
    console.error('Error checking purchase request:', err);
    res.status(500).json({ 
      message: 'Server error during purchase request check',
      error: err.message 
    });
  }
});

// @route    GET /api/products/client-products
// @desc     Get client's approved products inventory
// @access   Private (Client only)
router.get('/client-products', authMiddleware, async (req, res) => {
  try {
    // Ensure user is a client
    if (req.user.role !== 'client' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Client privileges required.' });
    }

    console.log(`Fetching approved products for client: ${req.user._id}, role: ${req.user.role}`);
    
    // 1. Get client's approved purchase requests
    const approvedRequests = await PurchaseRequest.find({
      clientId: req.user._id,
      status: 'approved'
    })
    .populate('productId', 'name sku price description category images reorderLevel')
    .sort({ updatedAt: -1 });

    console.log(`Found ${approvedRequests.length} approved purchase requests for client ${req.user._id}`);

    // 2. Find client's products (products with clientInventory data)
    const clientProducts = await Product.find({
      isClientUploaded: true,
      'clientInventory.currentStock': { $gt: 0 },
      createdBy: req.user._id
    });

    console.log(`Found ${clientProducts.length} client products with inventory data`);
    
    // 3. Merge approved request data with client products
    // Track products by ID to avoid duplicates
    const productMap = {};
    
    // Process approved requests
    approvedRequests.forEach(request => {
      if (!request.productId) return;
      
      const productId = typeof request.productId === 'object' ? 
        request.productId._id.toString() : request.productId.toString();
      
      if (!productMap[productId]) {
        // First time seeing this product
        productMap[productId] = {
          id: productId,
          name: request.productName || (request.productId?.name) || 'Unknown Product',
          sku: request.productId?.sku || 'N/A',
          description: request.productId?.description || '',
          category: request.productId?.category || 'General',
          price: request.price || request.productId?.price || 0,
          images: request.productId?.images || [],
          stock: request.quantity || 0,
          reorderLevel: request.productId?.reorderLevel || 5,
          lastUpdated: request.updatedAt,
          purchaseDate: request.updatedAt,
          originalProductId: productId
        };
      } else {
        // Add to existing product's stock
        productMap[productId].stock += request.quantity || 0;
        
        // Update last updated if this request is newer
        if (request.updatedAt > productMap[productId].lastUpdated) {
          productMap[productId].lastUpdated = request.updatedAt;
        }
      }
    });
    
    // Process client products
    clientProducts.forEach(product => {
      const productId = product._id.toString();
      
      if (!productMap[productId]) {
        // First time seeing this product
        productMap[productId] = {
          id: productId,
          name: product.name || 'Unknown Product',
          sku: product.sku || 'N/A',
          description: product.description || '',
          category: product.category || 'General',
          price: product.price || 0,
          images: product.images || [],
          stock: product.clientInventory?.currentStock || product.stock || 0,
          reorderLevel: product.clientInventory?.reorderLevel || product.reorderLevel || 5,
          lastUpdated: product.clientInventory?.lastUpdated || product.updatedAt,
          purchaseDate: product.createdAt,
          originalProductId: product.originalProductId || productId
        };
      }
      // If already in map from approved requests, client product data takes precedence
      else {
        productMap[productId].stock = product.clientInventory?.currentStock || product.stock || productMap[productId].stock;
        productMap[productId].reorderLevel = product.clientInventory?.reorderLevel || product.reorderLevel || productMap[productId].reorderLevel;
      }
    });
    
    // Add sample products if no products found (for development)
    if (Object.keys(productMap).length === 0) {
      console.log('No products found for client, adding sample product');
      productMap['sample-1'] = {
        id: 'sample-1',
        name: 'Sample Product',
        sku: 'SAMPLE-001',
        description: 'This is a sample product for testing',
        category: 'Demo',
        price: 99.99,
        images: [],
        stock: 10,
        reorderLevel: 3,
        lastUpdated: new Date(),
        purchaseDate: new Date(),
        originalProductId: 'sample-1'
      };
    }
    
    // Convert map to array
    const products = Object.values(productMap);
    
    // Calculate total approved stock
    const totalApprovedStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);

    // Return combined inventory data
    res.json({
      success: true,
      totalItems: products.length,
      totalApprovedStock,
      products,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching client products:', error);
    res.status(500).json({ 
      message: 'Server error while fetching client products',
      error: error.message
    });
  }
});

export default router;