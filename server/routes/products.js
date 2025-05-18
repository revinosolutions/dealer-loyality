import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

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
    
    // Filter by client uploaded status
    if (isClientUploaded !== undefined) {
      // Convert string 'true'/'false' to boolean
      const boolValue = isClientUploaded === 'true' || isClientUploaded === true;
      filter.isClientUploaded = boolValue;
      console.log(`Filtering products by isClientUploaded=${boolValue}`);
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
      // This is a special case to find products that have client inventory
      // We need to find products either:
      // 1. Created by this client (isClientUploaded = true)
      // 2. OR products that have clientInventory with currentStock > 0
      // 3. OR products that match this client's createdBy field
      // 4. OR products with clientInventory.initialStock defined
      console.log(`Finding client inventory products for client: ${clientId}`);
      
      // Convert clientId to ObjectId if it's a valid ObjectId string
      let clientIdObj = clientId;
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        clientIdObj = new mongoose.Types.ObjectId(clientId);
        console.log(`Converted clientId to ObjectId: ${clientIdObj}`);
      }
      
      // Replace the single filter with a more comprehensive $or condition
      filter.$or = [
        // Option 1: Products with client inventory (even with zero stock)
        { 'clientInventory.initialStock': { $exists: true } },
        
        // Option 2: Products with current stock
        { 'clientInventory.currentStock': { $exists: true } },
        
        // Option 3: Products directly created/uploaded by this client
        { isClientUploaded: true, createdBy: clientIdObj },
        
        // Option 4: Allow string ID comparison for older records
        { isClientUploaded: true, createdBy: clientId },
      ];
      
      console.log('Using expanded client inventory filter:', JSON.stringify(filter.$or));
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
  try {
    console.log(`[APPROVE] Processing approval for purchase request: ${req.params.id}`);
    
    // 1. Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // 2. Find the purchase request
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Purchase request not found' });
    }
    
    console.log(`[APPROVE] Found request:`, {
      id: request._id,
      clientId: request.clientId,
      productId: request.productId,
      quantity: request.quantity
    });

    // 3. Verify request is pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Purchase request cannot be approved. Current status: ${request.status}` 
      });
    }

    // 4. Find admin product
    const adminProduct = await Product.findById(request.productId);
    if (!adminProduct) {
      return res.status(404).json({ message: 'Admin product not found' });
    }
    
    console.log(`[APPROVE] Found admin product:`, {
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
    const clientId = typeof request.clientId === 'object' ? 
      (request.clientId._id || request.clientId.id) : 
      request.clientId;

    // 7. Find or create client product
    let clientProduct = await Product.findOne({
      name: adminProduct.name,
      'clientInventory.initialStock': { $exists: true },
      createdBy: clientId
    });
    
    let isNewClientProduct = false;
    
    // If client product doesn't exist, create one
    if (!clientProduct) {
      console.log(`[APPROVE] Creating new client product for client ${clientId}`);
      isNewClientProduct = true;
      
      // Generate a unique SKU with timestamp
      const uniqueSuffix = Date.now().toString().substring(8) + Math.floor(Math.random() * 10000);
      const clientSku = `CLIENT-${adminProduct.sku}-${uniqueSuffix}`;
      
      clientProduct = new Product({
        name: adminProduct.name,
        description: adminProduct.description,
        sku: clientSku,
        category: adminProduct.category,
        price: adminProduct.price,
        loyaltyPoints: adminProduct.loyaltyPoints,
        stock: request.quantity, // Set regular stock as well for proper display
        isClientUploaded: true,
        createdBy: clientId,
        organizationId: request.organizationId || adminProduct.organizationId,
        clientInventory: {
          initialStock: request.quantity,
          currentStock: request.quantity,
          reorderLevel: adminProduct.reorderLevel || 5,
          lastUpdated: new Date()
        }
      });
    } else {
      // Update existing client product inventory
      console.log(`[APPROVE] Updating existing client product: ${clientProduct._id}`);
      console.log(`Current stock: ${clientProduct.clientInventory.currentStock}, Adding: ${request.quantity}`);
      
      clientProduct.clientInventory.currentStock += request.quantity;
      clientProduct.clientInventory.lastUpdated = new Date();
      // Also update regular stock field for consistency and proper display
      clientProduct.stock = (clientProduct.stock || 0) + request.quantity;
    }

    // 8. Make all database updates in sequence

    // Step 1: Save client product (add stock to client)
    await clientProduct.save();
    console.log(`[APPROVE] Client product saved, new stock: ${clientProduct.clientInventory.currentStock}`);
    
    // Step 2: Update admin product (reduce stock from admin)
    const previousAdminStock = adminProduct.stock;
    adminProduct.stock -= request.quantity;
    await adminProduct.save();
    console.log(`[APPROVE] Admin product stock updated: ${previousAdminStock} -> ${adminProduct.stock}`);
    
    // Step 3: Update purchase request status
    request.status = 'approved';
    await request.save();
    console.log(`[APPROVE] Purchase request status updated to approved`);
    
    // 9. Send success response
    res.json({
      message: 'Purchase request approved successfully',
      request: {
        id: request._id,
        status: 'approved'
      },
      adminProduct: {
        id: adminProduct._id,
        name: adminProduct.name,
        previousStock: previousAdminStock,
        newStock: adminProduct.stock
      },
      clientProduct: {
        id: clientProduct._id,
        name: clientProduct.name,
        stock: clientProduct.clientInventory.currentStock,
        isNew: isNewClientProduct
      }
    });
  } catch (err) {
    console.error('[APPROVE] Error:', err);
    res.status(500).json({ 
      message: 'Server error during purchase request approval',
      error: err.message
    });
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
    
    // 1. Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'client_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // 2. Find the purchase request and fully populate references
    const request = await PurchaseRequest.findById(req.params.id)
      .populate('productId', 'name sku price stock images category reorderLevel')
      .populate('clientId', 'name email company');
      
    if (!request) {
      return res.status(404).json({ message: 'Purchase request not found' });
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
    const adminProduct = request.productId && typeof request.productId === 'object' 
      ? request.productId 
      : await Product.findById(request.productId);
      
    if (!adminProduct) {
      return res.status(404).json({ message: 'Admin product not found' });
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
    
    console.log(`[RELIABLE-APPROVE] Final clientId values for lookup:`, {
      originalClientId: request.clientId,
      extractedClientId: clientId,
      convertedObjectId: clientObjectId,
      clientIdType: typeof clientId,
      isValidObjectId: mongoose.Types.ObjectId.isValid(clientId)
    });

    // 7. Find or create client product
    console.log(`[RELIABLE-APPROVE] Searching for existing client product with name "${adminProduct.name}" and clientId "${clientObjectId}"`);
    
    // Try different queries to find an existing client product
    let clientProductQueries = [
      // Query 1: Simple match by name and createdBy with converted ObjectId
      { 
        name: adminProduct.name, 
        createdBy: clientObjectId 
      },
      // Query 2: Match by name and string clientId
      { 
        name: adminProduct.name, 
        createdBy: clientId 
      },
      // Query 3: Match by name and clientInventory with objectId
      { 
        name: adminProduct.name, 
        'clientInventory.initialStock': { $exists: true }, 
        createdBy: clientObjectId 
      },
      // Query 4: Match by name and clientInventory with string clientId
      { 
        name: adminProduct.name, 
        'clientInventory.initialStock': { $exists: true }, 
        createdBy: clientId 
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
    
    // If client product doesn't exist, create one
    if (!clientProduct) {
      console.log(`[RELIABLE-APPROVE] Creating new client product for client ${clientObjectId || clientId}`);
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
        createdBy: clientObjectId || clientId, // Use converted ObjectId if available
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
      
      // Step 3: Update purchase request status
      request.status = 'approved';
      const savedRequest = await request.save();
      console.log(`[RELIABLE-APPROVE] Purchase request status updated to approved, ID: ${savedRequest._id}`);
      
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
        }
      });
    } catch (dbError) {
      console.error('[RELIABLE-APPROVE] Database operation failed:', dbError);
      res.status(500).json({
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

// @route    GET /api/products/debug-client-inventory
// @desc     Debug endpoint to directly check for client inventory
// @access   Private
router.get('/debug-client-inventory', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.query;
    console.log(`[DEBUG] Direct client inventory lookup for client: ${clientId}`);
    
    if (!clientId) {
      return res.status(400).json({ message: 'ClientId is required' });
    }
    
    // Convert clientId to ObjectId if possible
    let clientObjectId = null;
    if (mongoose.Types.ObjectId.isValid(clientId)) {
      clientObjectId = new mongoose.Types.ObjectId(clientId);
      console.log(`[DEBUG] Converted clientId to ObjectId: ${clientObjectId}`);
    }
    
    // Try multiple queries to find any possible client products
    const queries = [
      // Direct createdBy match with ObjectId
      ...(clientObjectId ? [{ createdBy: clientObjectId }] : []),
      // Direct createdBy match with string
      { createdBy: clientId },
      // Any product with this client's inventory
      ...(clientObjectId ? [{ 'clientInventory.initialStock': { $exists: true }, createdBy: clientObjectId }] : []),
      { 'clientInventory.initialStock': { $exists: true }, createdBy: clientId },
      // Any product marked as client uploaded for this client
      ...(clientObjectId ? [{ isClientUploaded: true, createdBy: clientObjectId }] : []),
      { isClientUploaded: true, createdBy: clientId }
    ];
    
    console.log(`[DEBUG] Will try ${queries.length} different queries`);
    
    // Execute all queries and merge results
    const allProducts = [];
    const seenIds = new Set();
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`[DEBUG] Executing query #${i+1}:`, JSON.stringify(query));
      
      try {
        const products = await Product.find(query);
        console.log(`[DEBUG] Query #${i+1} found ${products.length} products`);
        
        // Add only products we haven't seen before
        for (const product of products) {
          if (!seenIds.has(product._id.toString())) {
            allProducts.push(product);
            seenIds.add(product._id.toString());
          }
        }
      } catch (err) {
        console.error(`[DEBUG] Error in query #${i+1}:`, err.message);
      }
    }
    
    console.log(`[DEBUG] Final result: ${allProducts.length} unique client products found`);
    
    // If we found products, log details of the first one
    if (allProducts.length > 0) {
      const sample = allProducts[0];
      console.log('[DEBUG] Sample product:', {
        id: sample._id,
        name: sample.name,
        createdBy: sample.createdBy,
        isClientUploaded: sample.isClientUploaded,
        clientInventory: sample.clientInventory
      });
    }
    
    return res.json({
      message: `Found ${allProducts.length} client products`,
      products: allProducts
    });
  } catch (err) {
    console.error('[DEBUG] Error in debug endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route    POST /api/products/repair-client-inventory
// @desc     Force repair client inventory based on approved purchase requests
// @access   Private
router.post('/repair-client-inventory', authMiddleware, async (req, res) => {
  try {
    const { clientId, forceRebuild = false } = req.body;
    
    console.log(`[REPAIR] Starting client inventory repair for client: ${clientId}`);
    console.log(`[REPAIR] Force rebuild: ${forceRebuild}`);
    
    // Validate client ID
    if (!clientId) {
      return res.status(400).json({ message: 'ClientId is required' });
    }
    
    // Convert clientId to ObjectId if possible
    let clientObjectId = clientId;
    if (mongoose.Types.ObjectId.isValid(clientId)) {
      clientObjectId = new mongoose.Types.ObjectId(clientId);
      console.log(`[REPAIR] Converted clientId to ObjectId: ${clientObjectId}`);
    }
    
    // Step 1: Find all approved purchase requests for this client
    const approvedRequests = await PurchaseRequest.find({
      clientId: clientObjectId,
      status: 'approved'
    }).populate('productId');
    
    console.log(`[REPAIR] Found ${approvedRequests.length} approved purchase requests`);
    
    if (approvedRequests.length === 0) {
      return res.status(404).json({ 
        message: 'No approved purchase requests found for this client',
        success: false
      });
    }
    
    // Step 2: Process each approved request to update client inventory
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      products: []
    };
    
    for (const request of approvedRequests) {
      try {
        // Skip if product is missing
        if (!request.productId) {
          console.log(`[REPAIR] Skipping request ${request._id} - missing product`);
          results.failed++;
          continue;
        }
        
        // Get the product details
        const adminProduct = typeof request.productId === 'object' 
          ? request.productId 
          : await Product.findById(request.productId);
          
        if (!adminProduct) {
          console.log(`[REPAIR] Skipping request ${request._id} - product not found`);
          results.failed++;
          continue;
        }
        
        // Try to find existing client product
        let clientProduct = await Product.findOne({
          name: adminProduct.name,
          createdBy: clientObjectId
        });
        
        if (clientProduct) {
          // Update existing client product
          console.log(`[REPAIR] Updating existing client product: ${clientProduct._id} (${clientProduct.name})`);
          
          // Create clientInventory if it doesn't exist
          if (!clientProduct.clientInventory) {
            clientProduct.clientInventory = {
              initialStock: 0,
              currentStock: 0,
              reorderLevel: adminProduct.reorderLevel || 5,
              lastUpdated: new Date()
            };
          }
          
          if (forceRebuild) {
            // Reset inventory and add request quantity
            clientProduct.clientInventory.currentStock = request.quantity;
            clientProduct.clientInventory.initialStock = request.quantity;
          } else {
            // Add to current stock
            clientProduct.clientInventory.currentStock += request.quantity;
            if (!clientProduct.clientInventory.initialStock) {
              clientProduct.clientInventory.initialStock = request.quantity;
            }
          }
          
          clientProduct.clientInventory.lastUpdated = new Date();
          clientProduct.isClientUploaded = true;
          
          await clientProduct.save();
          results.updated++;
          results.products.push({
            id: clientProduct._id,
            name: clientProduct.name,
            stock: clientProduct.clientInventory.currentStock,
            action: 'updated'
          });
        } else {
          // Create new client product
          console.log(`[REPAIR] Creating new client product for: ${adminProduct.name}`);
          
          const newClientProduct = new Product({
            name: adminProduct.name,
            description: adminProduct.description,
            sku: adminProduct.sku,
            category: adminProduct.category,
            price: adminProduct.price,
            loyaltyPoints: adminProduct.loyaltyPoints,
            stock: request.quantity, // Set base stock
            reorderLevel: adminProduct.reorderLevel,
            images: adminProduct.images,
            specifications: adminProduct.specifications,
            status: 'active',
            organizationId: req.user.organizationId,
            createdBy: clientObjectId,
            isClientUploaded: true,
            clientInventory: {
              initialStock: request.quantity,
              currentStock: request.quantity,
              reorderLevel: adminProduct.reorderLevel || 5,
              lastUpdated: new Date()
            }
          });
          
          await newClientProduct.save();
          results.created++;
          results.products.push({
            id: newClientProduct._id,
            name: newClientProduct.name,
            stock: request.quantity,
            action: 'created'
          });
        }
      } catch (requestErr) {
        console.error(`[REPAIR] Error processing request ${request._id}:`, requestErr);
        results.failed++;
      }
    }
    
    console.log(`[REPAIR] Repair completed. Created: ${results.created}, Updated: ${results.updated}, Failed: ${results.failed}`);
    
    // Set a flag to force inventory refresh on client side
    results.forceRefresh = true;
    
    return res.json({
      message: 'Client inventory repair completed',
      success: true,
      results
    });
  } catch (err) {
    console.error('[REPAIR] Error repairing client inventory:', err);
    res.status(500).json({ 
      message: 'Server error during inventory repair',
      success: false,
      error: err.message 
    });
  }
});

export default router;