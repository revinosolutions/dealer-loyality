import express from 'express';
import mongoose from 'mongoose';
import { check, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, sameOrganizationMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get models
const Product = mongoose.model('Product');
const User = mongoose.model('User');
const Order = mongoose.model('Order');

// @route    GET /api/products
// @desc     Get all products with filtering (organization-specific)
// @access   Private
router.get('/', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      minPoints,
      maxPoints,
      status, 
      search, 
      sort = 'newest',
      limit = 20, 
      page = 1,
      isClientUploaded,
      createdBy,
      hasClientInventory,
      clientId
    } = req.query;
    
    // Log the request for debugging
    console.log('GET /api/products request from user:', req.user.id, 'role:', req.user.role);
    
    if (createdBy) {
      console.log('Filtering products by createdBy:', createdBy);
    }
    
    if (isClientUploaded) {
      console.log('Filtering products by isClientUploaded:', isClientUploaded);
    }

    if (hasClientInventory) {
      console.log('Filtering products by hasClientInventory:', hasClientInventory);
      
      if (clientId) {
        console.log('Filtering by clientId for inventory:', clientId);
      }
    }
    
    // Build query
    const query = {};
    
    // Organization restriction - users can only see products from their organization
    if (req.user.organizationId) {
      query.organizationId = req.user.organizationId;
    }
    
    // Special case: If client is requesting their own products (createdBy === client ID)
    // Don't restrict status when client is viewing their own products
    if (req.user.role === 'client' && createdBy === req.user.id) {
      console.log('Client is requesting their own products - showing all statuses');
    } else if (['client', 'dealer'].includes(req.user.role) && !createdBy) {
      // Only show active products to clients and dealers when browsing all products
      query.status = 'active';
    } else if (status) {
      // Apply status filter if provided
      query.status = status;
    }
    
    // Apply other filters if provided
    if (category) {
      query.category = category;
    }
    
    if (minPrice !== undefined) {
      query.price = { $gte: Number(minPrice) };
    }
    
    if (maxPrice !== undefined) {
      query.price = { ...query.price, $lte: Number(maxPrice) };
    }
    
    if (minPoints !== undefined) {
      query.loyaltyPoints = { $gte: Number(minPoints) };
    }
    
    if (maxPoints !== undefined) {
      query.loyaltyPoints = { ...query.loyaltyPoints, $lte: Number(maxPoints) };
    }
    
    // Search query (search in name, description, sku)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Client upload filter
    if (isClientUploaded !== undefined) {
      query.isClientUploaded = isClientUploaded === 'true';
    }
    
    // Creator filter
    if (createdBy) {
      try {
        // Try to convert to ObjectId if possible
        const createdByObj = mongoose.Types.ObjectId.isValid(createdBy) ? 
                             new mongoose.Types.ObjectId(createdBy) : 
                             createdBy;
        
        query.createdBy = createdByObj;
        console.log('Using createdBy filter with value:', createdByObj);
      } catch (err) {
        console.error('Error converting createdBy to ObjectId:', err);
        query.createdBy = createdBy;
      }
    }

    // Filter for products that have clientInventory
    if (hasClientInventory === 'true') {
      query.clientInventory = { $exists: true, $ne: null };
      
      // Additional filter for clientInventory.currentStock > 0
      query['clientInventory.currentStock'] = { $gt: 0 };
      
      // If clientId is specified, we need to filter to only products where the
      // client has inventory (i.e., products transferred to them via purchase requests)
      if (clientId) {
        // Convert clientId to ObjectId
        let clientIdObj;
        try {
          clientIdObj = mongoose.Types.ObjectId.isValid(clientId) ? 
                        new mongoose.Types.ObjectId(clientId) : 
                        clientId;
          
          // We need to add a filter for products created by this client
          query.createdBy = clientIdObj;
          
          console.log('Filtering for client products with clientId:', clientIdObj);
        } catch (err) {
          console.error('Error converting clientId to ObjectId:', err);
          query.createdBy = clientId;
        }
        
        // Also ensure we're only getting client products
        query.isClientUploaded = true;
      }
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    
    switch (sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
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
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name')
      .populate('organizationId', 'name');
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    // Get distinct categories for filtering
    const categories = await Product.distinct('category', { organizationId: req.user.organizationId });
    
    console.log(`Found ${products.length} products matching query`);
    
    // If this is a client requesting products, log the types of products returned
    if (req.user.role === 'client') {
      const clientUploaded = products.filter(p => p.isClientUploaded).length;
      const withClientInventory = products.filter(p => p.clientInventory && p.clientInventory.currentStock > 0).length;
      const adminProducts = products.filter(p => !p.isClientUploaded && (!p.clientInventory || p.clientInventory.currentStock === 0)).length;
      
      console.log(`Product types for client: ${clientUploaded} client-uploaded, ${withClientInventory} with client inventory, ${adminProducts} admin products`);
    }
    
    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      },
      filters: {
        categories
      }
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/products/:id
// @desc     Get product by ID
// @access   Private
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId)
      .populate('createdBy', 'name')
      .populate('organizationId', 'name');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId && 
        product.organizationId && 
        req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Additional checks for client/dealer - can only see active products
    if (['client', 'dealer'].includes(req.user.role) && product.status !== 'active') {
      return res.status(403).json({ message: 'This product is not currently available' });
    }
    
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/products
// @desc     Create a new product (admin and client)
// @access   Private + Admin/Client
router.post('/', [
  authMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('price', 'Price must be a positive number').isFloat({ min: 0 }),
  check('loyaltyPoints', 'Loyalty points must be a positive number').isFloat({ min: 0 }),
  check('sku', 'SKU is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, description, sku, category, price, loyaltyPoints,
    stock, minOrderQuantity, maxOrderQuantity, images, 
    specifications, deals, status, initialInventory,
    isClientUploaded
  } = req.body;

  console.log(`Product creation request from user ${req.user.id} (${req.user.role})`);
  if (isClientUploaded) {
    console.log('CLIENT PRODUCT CREATION:');
    console.log('- Name:', name);
    console.log('- isClientUploaded:', isClientUploaded);
    console.log('- initialInventory:', initialInventory);
    console.log('- Stock:', stock);
  }

  try {
    // Check if product with same SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: 'A product with this SKU already exists' });
    }
    
    // Determine product fields based on user role
    const isClient = req.user.role === 'client' || isClientUploaded === true;
    
    const newProduct = new Product({
      name,
      description,
      sku: isClient ? `CLIENT-${req.user.id}-${sku}` : sku, // Prefix client products to avoid SKU conflicts
      category: category || (isClient ? 'Client Products' : 'General'),
      price,
      loyaltyPoints,
      stock: isClient ? 0 : (stock || 0), // For client products, main stock is 0, we use clientInventory
      minOrderQuantity: minOrderQuantity || 1,
      maxOrderQuantity: maxOrderQuantity || null,
      images: images || [],
      specifications: specifications || [],
      deals: deals || [],
      status: status || 'active',
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      isClientUploaded: isClient,
    });
    
    // Set client inventory if applicable
    if (isClient && initialInventory) {
      console.log(`Setting initial client inventory: ${initialInventory} for product ${name}`);
      newProduct.clientInventory = {
        initialStock: initialInventory,
        currentStock: initialInventory,
        reorderLevel: 5,
        lastUpdated: new Date()
      };
    }

    const savedProduct = await newProduct.save();
    
    // Record initial inventory movement based on role
    if (isClient && initialInventory > 0) {
      // Record client inventory movement
      const Inventory = mongoose.model('Inventory');
      await Inventory.recordMovement({
        productId: savedProduct._id,
        location: 'Client Inventory',
        quantity: initialInventory,
        movementType: 'in',
        performedBy: req.user.id,
        notes: 'Initial client product inventory'
      });
      
      console.log(`Recorded client inventory movement: ${initialInventory} units for product ${savedProduct._id}`);
    } else if (stock > 0 && !isClient) {
      // Record admin inventory movement
      const Inventory = mongoose.model('Inventory');
      await Inventory.recordMovement({
        productId: savedProduct._id,
        location: 'Warehouse',
        quantity: stock,
        movementType: 'in',
        performedBy: req.user.id,
        notes: 'Initial stock on product creation'
      });
    }

    res.status(201).json(savedProduct);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

// @route    PUT /api/products/:id
// @desc     Update product (admin only)
// @access   Private + Admin
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Find product
    let product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    // Extract fields to update
    const { 
      name, description, category, price, loyaltyPoints,
      stock, minOrderQuantity, maxOrderQuantity, images, 
      specifications, deals, status
    } = req.body;
    
    // Build update object with fields that are provided
    const updateFields = {};
    
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (category !== undefined) updateFields.category = category;
    if (price !== undefined) updateFields.price = Number(price);
    if (loyaltyPoints !== undefined) updateFields.loyaltyPoints = Number(loyaltyPoints);
    if (stock !== undefined) updateFields.stock = Number(stock);
    if (minOrderQuantity !== undefined) updateFields.minOrderQuantity = Number(minOrderQuantity);
    if (maxOrderQuantity !== undefined) updateFields.maxOrderQuantity = maxOrderQuantity ? Number(maxOrderQuantity) : null;
    if (images !== undefined) updateFields.images = images;
    if (specifications !== undefined) updateFields.specifications = specifications;
    if (deals !== undefined) updateFields.deals = deals;
    if (status !== undefined) updateFields.status = status;
    
    // Update product
    product = await Product.findByIdAndUpdate(
      productId,
      { $set: updateFields },
      { new: true }
    ).populate('createdBy', 'name');
    
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    DELETE /api/products/:id
// @desc     Delete product (admin only)
// @access   Private + Admin
router.delete('/:id', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Find product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    // Check if product has any open orders
    const openOrders = await Order.countDocuments({
      'items.productId': productId,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (openOrders > 0) {
      return res.status(400).json({ 
        message: `Cannot delete product with ${openOrders} open orders. Please process or cancel these orders first.` 
      });
    }
    
    // For safety, just mark as inactive instead of deleting
    product.status = 'discontinued';
    await product.save();
    
    res.json({ message: 'Product discontinued successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/products/:id/deals
// @desc     Add a deal to product (admin only)
// @access   Private + Admin
router.post('/:id/deals', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware,
  check('name', 'Deal name is required').not().isEmpty(),
  check('quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('bonusLoyaltyPoints', 'Bonus loyalty points must be a positive number').isFloat({ min: 0 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const productId = req.params.id;
    
    // Find product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    const { 
      name, description, quantity, discountPercentage, 
      bonusLoyaltyPoints, startDate, endDate, isActive 
    } = req.body;
    
    // Create new deal
    const newDeal = {
      name,
      description,
      quantity: Number(quantity),
      discountPercentage: discountPercentage ? Number(discountPercentage) : 0,
      bonusLoyaltyPoints: Number(bonusLoyaltyPoints),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive !== undefined ? isActive : true
    };
    
    // Add deal to product
    product.deals.push(newDeal);
    await product.save();
    
    res.status(201).json(product);
  } catch (err) {
    console.error('Add deal error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/products/:id/deals/:dealId
// @desc     Update a deal (admin only)
// @access   Private + Admin
router.put('/:id/deals/:dealId', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const { id: productId, dealId } = req.params;
    
    // Find product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    // Find deal
    const deal = product.deals.id(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Update deal fields
    const { 
      name, description, quantity, discountPercentage, 
      bonusLoyaltyPoints, startDate, endDate, isActive 
    } = req.body;
    
    if (name !== undefined) deal.name = name;
    if (description !== undefined) deal.description = description;
    if (quantity !== undefined) deal.quantity = Number(quantity);
    if (discountPercentage !== undefined) deal.discountPercentage = Number(discountPercentage);
    if (bonusLoyaltyPoints !== undefined) deal.bonusLoyaltyPoints = Number(bonusLoyaltyPoints);
    if (startDate !== undefined) deal.startDate = new Date(startDate);
    if (endDate !== undefined) deal.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) deal.isActive = isActive;
    
    await product.save();
    
    res.json(product);
  } catch (err) {
    console.error('Update deal error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product or deal not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    DELETE /api/products/:id/deals/:dealId
// @desc     Delete a deal (admin only)
// @access   Private + Admin
router.delete('/:id/deals/:dealId', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const { id: productId, dealId } = req.params;
    
    // Find product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    // Remove deal
    product.deals.id(dealId).remove();
    await product.save();
    
    res.json({ message: 'Deal removed successfully' });
  } catch (err) {
    console.error('Delete deal error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product or deal not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/products/categories
// @desc     Get all product categories for organization
// @access   Private
router.get('/categories/list', [
  authMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    // Get distinct categories for the organization
    const categories = await Product.distinct('category', { 
      organizationId: req.user.organizationId 
    });
    
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PATCH /api/products/:id/inventory
// @desc     Update product inventory (admin only)
// @access   Private + Admin
router.patch('/:id/inventory', [
  authMiddleware,
  adminMiddleware,
  sameOrganizationMiddleware
], async (req, res) => {
  try {
    const productId = req.params.id;
    const { currentStock, reorderLevel, reservedStock } = req.body;
    
    // Find product
    let product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has access to this product (same organization)
    if (req.user.organizationId.toString() !== product.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. Product is not in your organization.' });
    }
    
    // Update inventory fields
    if (currentStock !== undefined) product.stock = Number(currentStock);
    if (reorderLevel !== undefined) product.reorderLevel = Number(reorderLevel);
    if (reservedStock !== undefined) product.reservedStock = Number(reservedStock);
    
    // Save changes
    await product.save();
    
    // Also record inventory movement if stock changed
    if (currentStock !== undefined && currentStock !== product.stock) {
      try {
        const Inventory = mongoose.model('Inventory');
        
        // Create inventory movement
        const newMovement = new Inventory({
          productId,
          location: 'warehouse', // Default location
          quantity: Math.abs(currentStock - product.stock),
          movementType: currentStock > product.stock ? 'in' : 'out',
          performedBy: req.user.id,
          notes: 'Inventory adjustment via admin panel',
          previousStock: product.stock,
          newStock: currentStock
        });
        
        await newMovement.save();
      } catch (err) {
        console.error('Error recording inventory movement:', err);
        // Continue with response even if movement recording fails
      }
    }
    
    res.json(product);
  } catch (err) {
    console.error('Update product inventory error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PATCH /api/products/:id/client-inventory
// @desc     Update client product inventory
// @access   Private + Client
router.patch('/:id/client-inventory', [
  authMiddleware,
  check('currentStock', 'Current stock must be a positive number').isFloat({ min: 0 }),
], async (req, res) => {
  console.log(`CLIENT INVENTORY UPDATE REQUEST for product ${req.params.id}:`, req.body);
  
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in client inventory update:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentStock, reorderLevel } = req.body;
    const productId = req.params.id;
    
    console.log(`Looking for product ${productId} by client ${req.user.id}`);
    
    // Verify product exists and belongs to this client
    const product = await Product.findById(productId);
    
    if (!product) {
      console.error(`Product ${productId} not found`);
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product belongs to this client
    const productCreator = product.createdBy?.toString();
    const currentUser = req.user.id.toString();
    
    console.log('Product creator:', productCreator);
    console.log('Current user:', currentUser);
    
    // Allow update only if:
    // 1. User created this product, OR
    // 2. Product is client-uploaded and in user's organization
    if (
      productCreator !== currentUser &&
      !(product.isClientUploaded && product.organizationId?.toString() === req.user.organizationId?.toString())
    ) {
      console.error(`Unauthorized: User ${req.user.id} cannot update product ${productId} created by ${productCreator}`);
      return res.status(403).json({ message: 'You are not authorized to update this product\'s inventory' });
    }
    
    // Initialize clientInventory if not exists
    if (!product.clientInventory) {
      console.log(`Creating new clientInventory for product ${productId}`);
      product.clientInventory = {
        initialStock: currentStock,
        currentStock: currentStock,
        reorderLevel: reorderLevel || 5,
        lastUpdated: new Date()
      };
    } else {
      // Update existing clientInventory
      console.log(`Updating existing clientInventory: Current=${product.clientInventory.currentStock}, New=${currentStock}`);
      product.clientInventory.currentStock = currentStock;
      
      if (reorderLevel !== undefined) {
        product.clientInventory.reorderLevel = reorderLevel;
      }
      
      product.clientInventory.lastUpdated = new Date();
    }
    
    // Set isClientUploaded flag if not already set
    if (!product.isClientUploaded) {
      console.log(`Setting isClientUploaded=true for product ${productId}`);
      product.isClientUploaded = true;
    }
    
    // Save the updated product
    await product.save();
    
    console.log(`Successfully updated client inventory for ${productId} to ${currentStock} units`);
    
    // Return the updated product
    res.json({
      message: 'Inventory updated successfully',
      product
    });
  } catch (err) {
    console.error('Error updating client inventory:', err);
    res.status(500).json({ message: 'Server error while updating inventory', error: err.message });
  }
});

export default router; 