import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware, superAdminMiddleware, userOwnershipMiddleware, clientMiddleware, restrictSuperAdminCreatedAdmins, restrictAdminCreatedClients, restrictAdminCreatedBySuperAdmin, restrictClientCreatedDealers, sameOrganizationMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';

const router = express.Router();

// Get User model
const User = mongoose.model('User');

// Get all users (admin/superadmin only)
router.get('/', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const { role, status, search, limit = 20, page = 1 } = req.query;
    
    // Build query based on user role and filters
    let query = {};
    
    // Organization filtering
    if (req.user.role !== 'superadmin') {
      // Non-superadmins can only see users in their organization
      query.organizationId = req.user.organizationId;
    } else if (req.query.organizationId) {
      // Superadmins can filter by organizationId if provided
      query.organizationId = req.query.organizationId;
    }
    
    // Role-based access filtering
    if (req.user.role === 'client') {
      // Clients can only see their dealers
      query.role = 'dealer';
      query.clientId = req.user.id;
    } else if (req.user.role === 'admin') {
      // Admins can see clients and dealers in their organization but not other admins
      if (role) {
        if (role === 'admin' || role === 'superadmin') {
          return res.status(403).json({ message: 'Access denied' });
        }
        query.role = role;
      } else {
        query.role = { $in: ['client', 'dealer'] };
      }
    }
    
    // Additional filters
    if (role && req.user.role === 'superadmin') {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { 'company.name': searchRegex }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('clientId', 'name email')
      .populate('organizationId', 'name');
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Return users with pagination info
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client's dealers (client only)
router.get('/my-dealers', [authMiddleware, restrictAdminCreatedClients], async (req, res) => {
  try {
    // Ensure user is a client
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied. Only clients can access their dealers.' });
    }
    
    // Find dealers associated with this client
    const dealers = await User.find({
      role: 'dealer',
      clientId: req.user.id
    }).select('-password');
    
    res.json(dealers);
  } catch (err) {
    console.error('Get dealers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('clientId', 'name email')
      .populate('organizationId', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Enforce organization-based access control
    if (req.user.role !== 'superadmin' && 
        user.organizationId && req.user.organizationId &&
        user.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ message: 'Access denied. User is not in your organization.' });
    }
    
    // Enforce role-based access control
    if (req.user.role === 'client') {
      // Clients can only view their dealers
      if (user.role !== 'dealer' || user.clientId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You can only view your own dealers.' });
      }
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (admin/superadmin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  restrictSuperAdminCreatedAdmins,
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('role', 'Role is required').isIn(['admin', 'client', 'dealer'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, phone, clientId, company, address, createdBySuperAdmin } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Role authorization checks
    if (req.user.role === 'admin') {
      // Admin can only create clients
      if (role === 'superadmin' || role === 'admin' || role === 'dealer') {
        return res.status(403).json({ message: 'You cannot create users with this role' });
      }
    } else if (req.user.role === 'client') {
      // Client can only create dealers
      if (role !== 'dealer') {
        return res.status(403).json({ message: 'Clients can only create dealer accounts' });
      }
    }

    // Set createdBySuperAdmin flag when superadmin creates an admin
    let isCreatedBySuperAdmin = false;
    if (req.user.role === 'superadmin' && role === 'admin' && (createdBySuperAdmin === true)) {
      isCreatedBySuperAdmin = true;
    }

    // Set createdByAdmin flag when admin creates a client
    let isCreatedByAdmin = false;
    if ((req.user.role === 'admin' || req.user.role === 'superadmin') && role === 'client') {
      isCreatedByAdmin = true;
    }
    
    // Set createdByClient flag when client creates a dealer
    let isCreatedByClient = false;
    if (req.user.role === 'client' && role === 'dealer') {
      isCreatedByClient = true;
    }

    // If creating a dealer, validate clientId if provided
    if (role === 'dealer' && clientId) {
      const client = await User.findById(clientId);
      if (!client || client.role !== 'client') {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
    } else if (role === 'dealer') {
      // If no clientId provided for dealer, use the current client's ID
      if (req.user.role === 'client') {
        clientId = req.user.id;
      } else {
        return res.status(400).json({ message: 'Client ID is required for dealer accounts' });
      }
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role,
      phone,
      clientId: role === 'dealer' ? clientId : undefined,
      company,
      address,
      createdBySuperAdmin: isCreatedBySuperAdmin,
      createdByAdmin: isCreatedByAdmin,
      createdByClient: isCreatedByClient,
      stats: {
        totalSales: 0,
        contestsWon: 0,
        contestsParticipated: 0,
        rewardsRedeemed: 0,
        lastActive: new Date()
      },
      notificationPreferences: {
        app: true,
        email: true,
        whatsapp: false
      }
    });

    await user.save();

    // Return user without password
    const savedUser = await User.findById(user._id).select('-password');
    res.json(savedUser);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin/superadmin or user themself)
router.put('/:id', [
  authMiddleware,
  sameOrganizationMiddleware,
  check('name', 'Name is required if updating').optional().not().isEmpty(),
  check('email', 'Please include a valid email if updating').optional().isEmail(),
  check('password', 'Password must be at least 6 characters if updating').optional().isLength({ min: 6 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.params.id;
    const { name, email, role, phone, status, clientId, company, address, notificationPreferences } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Permission checks
    if (req.user.role !== 'superadmin') {
      // Non-superadmins can only update users in their organization
      if (!user.organizationId || 
          !req.user.organizationId || 
          user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ message: 'Access denied. User is not in your organization.' });
      }
      
      // Role-based restrictions
      if (req.user.role === 'admin') {
        // Admins can only update clients or dealers
        if (user.role === 'admin' || user.role === 'superadmin') {
          return res.status(403).json({ message: 'Admins cannot update other admins' });
        }
      } else if (req.user.role === 'client') {
        // Clients can only update their dealers
        if (user.role !== 'dealer' || user.clientId.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Clients can only update their own dealers' });
        }
      } else if (req.user.id !== userId) {
        // Dealers can only update themselves
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Only superadmin can change user roles
    if (role && req.user.role !== 'superadmin' && role !== user.role) {
      return res.status(403).json({ message: 'You cannot change user roles' });
    }

    // If changing to dealer, validate clientId if provided
    if (role === 'dealer' && clientId && clientId !== user.clientId?.toString()) {
      const client = await User.findById(clientId);
      if (!client || client.role !== 'client') {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone) user.phone = phone;
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      user.status = status;
    }
    
    // Update clientId for dealers
    if (user.role === 'dealer' && clientId) {
      user.clientId = clientId;
    }
    
    // Update company info
    if (company) {
      user.company = { ...user.company, ...company };
    }
    
    // Update address
    if (address) {
      user.address = { ...user.address, ...address };
    }
    
    // Update notification preferences
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    user.updatedAt = Date.now();
    await user.save();

    // Return updated user (minus password)
    const updatedUser = await User.findById(userId).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Update user error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin/superadmin only)
router.delete('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Permission checks
    if (req.user.role !== 'superadmin') {
      // Non-superadmins can only delete users in their organization
      if (!user.organizationId || 
          !req.user.organizationId || 
          user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ message: 'Access denied. User is not in your organization.' });
      }
      
      // Role-based restrictions
      if (req.user.role === 'admin') {
        // Admins can only delete clients or dealers
        if (user.role === 'admin' || user.role === 'superadmin') {
          return res.status(403).json({ message: 'Admins cannot delete other admins' });
        }
      } else if (req.user.role === 'client') {
        // Clients can only delete their dealers
        if (user.role !== 'dealer' || user.clientId.toString() !== req.user.id) {
          return res.status(403).json({ message: 'Clients can only delete their own dealers' });
        }
      } else {
        // Dealers cannot delete users
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Check if user has any dependent records (dealers, orders, sales, etc.)
    // For example, check if trying to delete a client who has dealers
    if (user.role === 'client') {
      const dealerCount = await User.countDocuments({ clientId: userId });
      if (dealerCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete client with ${dealerCount} associated dealers. Delete or reassign these dealers first.` 
        });
      }
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats/dashboard data
router.get('/:id/stats', [authMiddleware, userOwnershipMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Different stats based on user role
    let stats = {
      basicStats: user.stats,
      recentActivity: [],
      performanceMetrics: {}
    };
    
    // Role-specific stats enrichment would go here
    // This would connect to other collections like sales, contests, etc.
    
    res.json(stats);
  } catch (err) {
    console.error('Get user stats error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/users/admin
// @desc     Create a new admin user (superadmin only)
// @access   Private + SuperAdmin
router.post('/admin', [
  authMiddleware,
  superAdminMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('organizationId', 'Organization ID is required').not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone, organizationId, status } = req.body;

  try {
    // Check if user with this email already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Check if organization exists
    const Organization = mongoose.model('Organization');
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }
    
    // Create new admin user
    // Store the original password for the response
    const originalPassword = password;
    
    // Create the user with regular password handling (hashing will happen via middleware)
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      status: status || 'active',
      phone,
      organizationId,
      createdBySuperAdmin: true
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    // Add the original password to the response (this will NOT be stored in the DB)
    userResponse.plainPassword = originalPassword;
    
    console.log(`Created admin user ${name} (${email}) with password: ${originalPassword}`);
    
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/users/client
// @desc     Create a new client user (admin only)
// @access   Private + Admin (not superadmin-created admin)
router.post('/client', [
  authMiddleware,
  adminMiddleware,
  restrictAdminCreatedBySuperAdmin,
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, email, password, phone, 
    company, address, status
  } = req.body;

  try {
    // Check if user with this email already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new client user
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: 'client',
      status: status || 'active',
      phone,
      company,
      address,
      createdByAdmin: true,
      organizationId: req.user.organizationId // Assign to admin's organization
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/users/dealer
// @desc     Create a new dealer user (client only)
// @access   Private + Client
router.post('/dealer', [
  authMiddleware,
  clientMiddleware,
  restrictAdminCreatedClients,
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, email, password, phone, 
    address, status
  } = req.body;

  try {
    // Check if user with this email already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new dealer user
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: 'dealer',
      status: status || 'active',
      phone,
      address,
      clientId: req.user.id,
      createdByClient: true,
      organizationId: req.user.organizationId // Assign to client's organization
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Create dealer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/users/:id/dealers
// @desc     Get all dealers for a client
// @access   Private + Admin, SuperAdmin, or Client owner
router.get('/:id/dealers', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Find client to verify existence and access rights
    const client = await User.findById(clientId).select('organizationId role');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    if (client.role !== 'client') {
      return res.status(400).json({ message: 'User is not a client' });
    }
    
    // Permission checks
    if (req.user.role !== 'superadmin') {
      // Non-superadmins can only access users in their organization
      if (!client.organizationId || 
          !req.user.organizationId || 
          client.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ message: 'Access denied. Client is not in your organization.' });
      }
      
      // Role-based restrictions
      if (req.user.role === 'client' && req.user.id !== clientId) {
        // Clients can only access their own dealers
        return res.status(403).json({ message: 'Clients can only view their own dealers' });
      }
    }
    
    // Pagination params
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { 
      role: 'dealer',
      clientId
    };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Get dealers
    const dealers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.json({
      dealers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get client dealers error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all users in an organization (superadmin only)
router.delete('/by-organization/:organizationId', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Count users to delete
    const userCount = await User.countDocuments({ organizationId });
    
    if (userCount === 0) {
      return res.status(404).json({ message: 'No users found for this organization' });
    }
    
    // Delete all users associated with this organization
    const deleteResult = await User.deleteMany({ organizationId });
    
    res.json({ 
      message: `Successfully deleted ${deleteResult.deletedCount} users from the organization`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (err) {
    console.error('Delete users by organization error:', err);
    
    // Check if error is due to invalid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password (superadmin only)
router.post('/:id/reset-password', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Generate a random password or use the provided one
    const { newPassword = 'Password123' } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only allow superadmins to reset passwords for admin users
    if (user.role !== 'admin' && req.user.role === 'superadmin') {
      return res.status(403).json({ message: 'You can only reset passwords for admin users' });
    }
    
    // Update the password
    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();
    
    res.json({ 
      message: 'Password has been reset successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      temporaryPassword: newPassword
    });
  } catch (err) {
    console.error('Reset password error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/users/check-dealer
// @desc     Check if a dealer exists and can login
// @access   Public
router.post('/check-dealer', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // If user doesn't exist or isn't a dealer, return general error
    // This is to avoid revealing which emails are registered
    if (!user || user.role !== 'dealer') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(400).json({ message: 'Your account is not active. Please contact your client.' });
    }
    
    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Find client information
    let clientInfo = null;
    if (user.clientId) {
      const client = await User.findById(user.clientId).select('name email _id');
      if (client) {
        clientInfo = {
          id: client._id,
          name: client.name,
          email: client.email
        };
      }
    }
    
    // At this point, the dealer exists and credentials are valid
    res.json({ 
      valid: true, 
      dealerId: user._id,
      name: user.name,
      email: user.email,
      client: clientInfo
    });
  } catch (err) {
    console.error('Check dealer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/users/:id/send-credentials
// @desc     Send login credentials to a dealer
// @access   Private + Client who owns the dealer
router.post('/:id/send-credentials', [
  authMiddleware,
  clientMiddleware,
  check('message', 'Message is required').not().isEmpty()
], async (req, res) => {
  try {
    const dealerId = req.params.id;
    const { message } = req.body;
    
    // Find the dealer
    const dealer = await User.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }
    
    // Verify this is actually a dealer
    if (dealer.role !== 'dealer') {
      return res.status(400).json({ message: 'User is not a dealer' });
    }
    
    // Verify the client owns this dealer
    if (dealer.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only send credentials to dealers you created' });
    }
    
    // Try to find a notification system
    let notificationSent = false;
    try {
      // If the notification model exists, create a notification
      if (mongoose.models.Notification) {
        const Notification = mongoose.models.Notification;
        
        await new Notification({
          recipient: dealerId,
          sender: req.user.id,
          type: 'credentials',
          title: 'Your Login Credentials',
          message: message,
          deliveryStatus: {
            app: 'sent',
            email: 'pending',
            whatsapp: 'not_applicable'
          }
        }).save();
        
        notificationSent = true;
        console.log('Created notification with credentials for dealer');
        
        // Process notification immediately
        try {
          const { processNotificationQueue } = await import('../services/notificationDeliveryService.js');
          await processNotificationQueue();
          console.log('Processed notification queue');
        } catch (queueErr) {
          console.error('Error processing notification queue:', queueErr);
        }
      } else {
        console.warn('Notification model not found, sending email directly');
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }
    
    // If notification system not available, try to send email directly
    if (!notificationSent) {
      try {
        // Check if nodemailer is available
        const nodemailer = await import('nodemailer');
        
        // Create test account if no email config
        const testAccount = await nodemailer.createTestAccount();
        
        // Create transporter
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER || testAccount.user,
            pass: process.env.EMAIL_PASS || testAccount.pass
          }
        });
        
        // Send mail
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@example.com',
          to: dealer.email,
          subject: 'Your Login Credentials',
          text: message,
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`
        });
        
        console.log('Email sent:', info.messageId);
        
        // If using ethereal, provide preview URL
        if (!process.env.EMAIL_HOST) {
          console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        notificationSent = true;
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }
    
    res.json({ 
      message: 'Credentials sent to dealer',
      sent: notificationSent,
      dealer: {
        id: dealer._id,
        name: dealer.name,
        email: dealer.email
      }
    });
  } catch (err) {
    console.error('Send dealer credentials error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 