import express from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filtering
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      category, 
      status, 
      search, 
      minPrice, 
      maxPrice,
      sortBy,
      sortOrder,
      limit = 20,
      page = 1,
      createdBy
    } = req.query;
    
    // Build query
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
      console.log(`Filtering products by createdBy: ${createdBy}`);
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      
      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }
      
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }
    
    // Log the full query for debugging
    console.log('Product query:', JSON.stringify(query));
    
    // Handle pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Handle sorting
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }
    
    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    // Log the number of products found
    console.log(`Found ${products.length} products matching query`);
    
    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private - Super Admin only
 */
router.post('/', authMiddleware, authorize(['admin']), async (req, res) => {
  try {
    const { 
      name, 
      sku, 
      description, 
      category, 
      price,
      loyaltyPoints,
      stock,
      reorderLevel,
      minOrderQuantity,
      maxOrderQuantity,
      images,
      specifications,
      deals,
      status,
      organizationId
    } = req.body;
    
    // Check if product with SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this SKU already exists' });
    }

    // Use the authenticated user's ID as createdBy
    const createdBy = req.user.id;
    console.log('Creating product with createdBy:', createdBy);
    
    // If organizationId is not provided, use the user's organization
    const userOrgId = req.user.organizationId || undefined;
    const productOrgId = organizationId || userOrgId;
    
    if (!productOrgId) {
      console.warn('No organization ID provided for product and user does not have an organization');
    } else {
      console.log('Using organization ID for product:', productOrgId);
    }
    
    // Create new product
    const product = new Product({
      name,
      sku,
      description,
      category,
      price,
      loyaltyPoints,
      stock,
      reorderLevel,
      minOrderQuantity,
      maxOrderQuantity,
      images,
      specifications,
      deals,
      status,
      organizationId: productOrgId,
      createdBy // Always set createdBy to the current user's ID
    });
    
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to save product. Please try again.' });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private - Super Admin only
 */
router.put('/:id', authMiddleware, authorize(['admin']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      price,
      loyaltyPoints,
      stock,
      reorderLevel,
      minOrderQuantity,
      maxOrderQuantity,
      images,
      specifications,
      deals,
      status
    } = req.body;
    
    // Find product
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price !== undefined) product.price = price;
    if (loyaltyPoints !== undefined) product.loyaltyPoints = loyaltyPoints;
    if (stock !== undefined) product.stock = stock;
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;
    if (minOrderQuantity !== undefined) product.minOrderQuantity = minOrderQuantity;
    if (maxOrderQuantity !== undefined) product.maxOrderQuantity = maxOrderQuantity;
    if (images) product.images = images;
    if (specifications) product.specifications = specifications;
    if (deals) product.deals = deals;
    if (status) product.status = status;
    
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PATCH /api/products/:id/inventory
 * @desc    Update product inventory
 * @access  Private - Super Admin only
 */
router.patch('/:id/inventory', authMiddleware, authorize(['admin']), async (req, res) => {
  try {
    const { stock, reorderLevel, reservedStock } = req.body;
    
    // Find product
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update inventory fields
    if (stock !== undefined) product.stock = stock;
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;
    if (reservedStock !== undefined) product.reservedStock = reservedStock;
    
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private - Super Admin only
 */
router.delete('/:id', authMiddleware, authorize(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.remove();
    
    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/products/categories
 * @desc    Get all unique product categories
 * @access  Private
 */
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
