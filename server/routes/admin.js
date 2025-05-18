import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, superAdminMiddleware, restrictSuperAdminCreatedAdmins } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();
const Product = mongoose.model('Product');

// Create Settings Schema
const settingsSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // platform, database, api
  settings: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create the Settings model if it doesn't exist
let Settings;
try {
  Settings = mongoose.model('Settings');
} catch (error) {
  Settings = mongoose.model('Settings', settingsSchema);
}

// Initialize default settings if they don't exist
const initializeSettings = async () => {
  const platformSettings = await Settings.findOne({ type: 'platform' });
  if (!platformSettings) {
    await Settings.create({
      type: 'platform',
      settings: {
        siteName: 'Revino Dealer Loyalty Platform',
        maintenanceMode: false,
        allowRegistration: true,
        defaultUserRole: 'dealer',
        systemNotifications: true,
        analyticsTracking: true
      }
    });
  }

  const dbSettings = await Settings.findOne({ type: 'database' });
  if (!dbSettings) {
    await Settings.create({
      type: 'database',
      settings: {
        connectionStatus: 'Connected',
        dbSize: 'Unknown',
        backupFrequency: 'daily',
        lastBackup: new Date().toISOString(),
        autoCleanup: true,
        cleanupOlderThan: '30'
      }
    });
  }

  const apiSettings = await Settings.findOne({ type: 'api' });
  if (!apiSettings) {
    await Settings.create({
      type: 'api',
      settings: {
        enablePublicApi: false,
        requireApiKey: true,
        rateLimitPerMinute: '60',
        webhookEndpoint: '',
        webhookSecret: '',
        logApiCalls: true
      }
    });
  }

  console.log('Default settings initialized');
};

// Call the function when the server starts
initializeSettings().catch(error => {
  console.error('Error initializing settings:', error);
});

// Get all settings
router.get('/settings', [authMiddleware, superAdminMiddleware, restrictSuperAdminCreatedAdmins], async (req, res) => {
  try {
    const platformSettings = await Settings.findOne({ type: 'platform' });
    const dbSettings = await Settings.findOne({ type: 'database' });
    const apiSettings = await Settings.findOne({ type: 'api' });

    // Calculate DB size (in a real scenario this would be a more complex operation)
    const dbSize = await calculateDbSize();
    
    // Update DB size in the database
    if (dbSettings) {
      dbSettings.settings.dbSize = dbSize;
      await dbSettings.save();
    }

    res.json({
      platform: platformSettings ? platformSettings.settings : {},
      database: dbSettings ? dbSettings.settings : {},
      api: apiSettings ? apiSettings.settings : {}
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.post('/settings', [authMiddleware, superAdminMiddleware, restrictSuperAdminCreatedAdmins], async (req, res) => {
  try {
    const { platform, database, api } = req.body;

    if (platform) {
      await Settings.findOneAndUpdate(
        { type: 'platform' },
        { 
          settings: platform,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    if (database) {
      await Settings.findOneAndUpdate(
        { type: 'database' },
        { 
          settings: database,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    if (api) {
      await Settings.findOneAndUpdate(
        { type: 'api' },
        { 
          settings: api,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Backup database
router.post('/database/backup', [authMiddleware, superAdminMiddleware, restrictSuperAdminCreatedAdmins], async (req, res) => {
  try {
    // In a real implementation, this would trigger a database backup process
    // For this example, we'll just update the last backup time

    const currentTime = new Date().toISOString();
    
    await Settings.findOneAndUpdate(
      { type: 'database' },
      { 
        'settings.lastBackup': currentTime,
        updatedAt: new Date()
      }
    );

    res.json({ 
      message: 'Database backup initiated successfully',
      lastBackup: currentTime
    });
  } catch (error) {
    console.error('Error backing up database:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate new API key
router.post('/api-keys/generate', [authMiddleware, superAdminMiddleware, restrictSuperAdminCreatedAdmins], async (req, res) => {
  try {
    // In a real implementation, this would generate a secure API key and store it
    // For this example, we'll just return a mock API key
    
    const apiKey = 'api_' + Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    res.json({ 
      message: 'API key generated successfully',
      apiKey
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate database size
const calculateDbSize = async () => {
  try {
    // In a real implementation, this would query MongoDB for database stats
    // For this example, we'll just return a mock size based on the number of documents
    
    // Count documents in some key collections
    const collections = ['users', 'organizations', 'products', 'orders', 'sales'];
    let totalDocs = 0;
    
    for (const collection of collections) {
      if (mongoose.connection.collections[collection]) {
        totalDocs += await mongoose.connection.collections[collection].countDocuments();
      }
    }
    
    // Basic calculation (very rough estimate)
    const estimatedSizeMB = (totalDocs * 0.01).toFixed(2);
    return `${estimatedSizeMB} MB`;
  } catch (error) {
    console.error('Error calculating DB size:', error);
    return 'Unknown';
  }
};

// Get User model
const User = mongoose.model('User');

// @route    GET /api/admin/stats
// @desc     Get overall system stats (superadmin only)
// @access   Private + SuperAdmin
router.get('/stats', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    // Get user counts by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format the results
    const formattedUserCounts = {};
    userCounts.forEach((item) => {
      formattedUserCounts[item._id] = item.count;
    });
    
    res.json({
      userCounts: formattedUserCounts
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/admin/dashboard-stats
// @desc     Get stats for admin dashboard
// @access   Private + Admin
router.get('/dashboard-stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    // Only find users in the admin's organization
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'No organization associated with your account' });
    }
    
    // Get client user count
    const totalClients = await User.countDocuments({ 
      role: 'client',
      organizationId 
    });
    
    // Get active client user count
    const activeClients = await User.countDocuments({ 
      role: 'client',
      status: 'active',
      organizationId 
    });
    
    // Get dealer user count
    const totalDealers = await User.countDocuments({ 
      role: 'dealer',
      organizationId 
    });
    
    // Get active dealer user count
    const activeDealers = await User.countDocuments({ 
      role: 'dealer',
      status: 'active',
      organizationId 
    });
    
    res.json({
      totalClients,
      activeClients,
      totalDealers,
      activeDealers
    });
  } catch (err) {
    console.error('Get admin dashboard stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Product management endpoints for admin users
router.get('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Extract organization ID from the authenticated user
    const organizationId = req.user.organizationId || req.user.organization;
    
    const products = await Product.find({ organizationId })
      .sort({ createdAt: -1 });
    
    res.json({ products });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

router.post('/products', authMiddleware, adminMiddleware, [
  check('name', 'Name is required').notEmpty(),
  check('sku', 'SKU is required').notEmpty(),
  check('price', 'Price must be a positive number').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Extract organization ID from the authenticated user
    const organizationId = req.user.organizationId || req.user.organization;
    
    const newProduct = new Product({
      ...req.body,
      createdBy: req.user.id,
      organizationId
    });
    
    await newProduct.save();
    res.status(201).json({ product: newProduct, message: 'Product created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A product with this SKU already exists' });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error while creating product' });
  }
});

router.put('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Extract organization ID from the authenticated user
    const organizationId = req.user.organizationId || req.user.organization;
    
    const updates = { ...req.body, updatedAt: Date.now() };
    delete updates._id; // Remove _id if present to avoid immutable field error
    
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or you do not have permission to update it' });
    }
    
    res.json({ product, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error while updating product' });
  }
});

router.delete('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Extract organization ID from the authenticated user
    const organizationId = req.user.organizationId || req.user.organization;
    
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      organizationId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or you do not have permission to delete it' });
    }
    
    // You may want to add additional logic here to handle related data
    // For example, updating inventory records
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
});

export default router; 

