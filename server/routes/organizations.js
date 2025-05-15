import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, superAdminMiddleware, adminMiddleware, sameOrganizationMiddleware } from '../middleware/auth.js';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Load the Organization model
const Organization = mongoose.model('Organization');
const User = mongoose.model('User');

// @route    GET /api/organizations
// @desc     Get all organizations (superadmin) or user's organization (others)
// @access   Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Superadmins can see all organizations
    if (req.user.role === 'superadmin') {
      const organizations = await Organization.find()
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      
      return res.json(organizations);
    }
    
    // Other users can only see their own organization
    if (!req.user.organizationId) {
      return res.status(404).json({ message: 'No organization associated with your account' });
    }
    
    const organization = await Organization.findById(req.user.organizationId)
      .populate('createdBy', 'name email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json([organization]);
  } catch (err) {
    console.error('Get organizations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/organizations/:id
// @desc     Get organization by ID
// @access   Private
router.get('/:id', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // For non-superadmins, ensure they can only access their organization
    if (req.user.role !== 'superadmin' && 
        (!req.user.organizationId || req.user.organizationId.toString() !== organizationId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const organization = await Organization.findById(organizationId)
      .populate('createdBy', 'name email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (err) {
    console.error('Get organization error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/organizations
// @desc     Create a new organization (superadmin only)
// @access   Private + SuperAdmin
router.post('/', [
  authMiddleware, 
  superAdminMiddleware,
  check('name', 'Organization name is required').not().isEmpty(),
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, description, logo, settings,
    contactInfo, status
  } = req.body;

  try {
    // Check if organization with same name already exists
    const existingOrganization = await Organization.findOne({ name });
    if (existingOrganization) {
      return res.status(400).json({ message: 'Organization with this name already exists' });
    }
    
    // Create new organization
    const newOrganization = new Organization({
      name,
      description,
      logo,
      status: status || 'active',
      settings,
      contactInfo,
      createdBy: req.user.id
    });
    
    const organization = await newOrganization.save();
    
    res.status(201).json(organization);
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    POST /api/organizations/with-admin
// @desc     Create a new organization with admin user (superadmin only)
// @access   Private + SuperAdmin
router.post('/with-admin', [
  authMiddleware, 
  superAdminMiddleware,
  check('organization.name', 'Organization name is required').not().isEmpty(),
  check('admin.name', 'Admin name is required').not().isEmpty(),
  check('admin.email', 'Please include a valid email for admin').isEmail(),
  check('admin.password', 'Admin password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { organization, admin } = req.body;

  try {
    // Check if organization with same name already exists
    const existingOrganization = await Organization.findOne({ name: organization.name });
    if (existingOrganization) {
      return res.status(400).json({ message: 'Organization with this name already exists' });
    }
    
    // Check if admin with email already exists
    const existingAdmin = await User.findOne({ email: admin.email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new organization
    const newOrganization = new Organization({
      name: organization.name,
      description: organization.description,
      logo: organization.logo,
      status: organization.status || 'active',
      settings: organization.settings,
      contactInfo: organization.contactInfo,
      createdBy: req.user.id
    });
    
    const savedOrganization = await newOrganization.save();
    
    // Store the original password
    const originalPassword = admin.password;
    
    // Create new admin user
    const newAdmin = new User({
      name: admin.name,
      email: admin.email.toLowerCase(),
      password: admin.password,
      role: 'admin',
      status: admin.status || 'active',
      phone: admin.phone,
      organizationId: savedOrganization._id,
      createdBySuperAdmin: true
    });
    
    await newAdmin.save();
    
    // Remove password from response
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;
    
    // Add the original password to the response (this will NOT be stored in the DB)
    adminResponse.plainPassword = originalPassword;
    
    console.log(`Created organization ${organization.name} with admin user ${admin.name} (${admin.email}). Password: ${originalPassword}`);
    
    res.status(201).json({
      organization: savedOrganization,
      admin: adminResponse
    });
  } catch (err) {
    console.error('Create organization with admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    PUT /api/organizations/:id
// @desc     Update organization
// @access   Private + SuperAdmin or Admin
router.put('/:id', [
  authMiddleware,
  check('name', 'Name is required if updating').optional().not().isEmpty()
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const organizationId = req.params.id;
    
    // Get the organization
    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'superadmin') {
      // Regular admins can only update their own organization and with restrictions
      if (!req.user.organizationId || req.user.organizationId.toString() !== organizationId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Admins can't change organization name, status, or creation details
      if (req.body.name || req.body.status || req.body.createdBy) {
        return res.status(403).json({ 
          message: 'Admins cannot change organization name, status, or creation details' 
        });
      }
    }
    
    // Update fields from request
    const { 
      name, description, logo, settings,
      contactInfo, status
    } = req.body;
    
    if (name) organization.name = name;
    if (description !== undefined) organization.description = description;
    if (logo !== undefined) organization.logo = logo;
    if (status && req.user.role === 'superadmin') organization.status = status;
    
    // Update nested fields
    if (settings) {
      // Merge settings rather than replace
      organization.settings = {
        ...organization.settings,
        ...settings,
        theme: {
          ...(organization.settings?.theme || {}),
          ...(settings.theme || {})
        },
        features: {
          ...(organization.settings?.features || {}),
          ...(settings.features || {})
        },
        customization: {
          ...(organization.settings?.customization || {}),
          ...(settings.customization || {})
        }
      };
    }
    
    if (contactInfo) {
      organization.contactInfo = {
        ...organization.contactInfo,
        ...contactInfo,
        address: {
          ...(organization.contactInfo?.address || {}),
          ...(contactInfo.address || {})
        }
      };
    }
    
    // Save the updated organization
    const updatedOrganization = await organization.save();
    
    res.json(updatedOrganization);
  } catch (err) {
    console.error('Update organization error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    DELETE /api/organizations/:id
// @desc     Delete organization (superadmin only)
// @access   Private + SuperAdmin
router.delete('/:id', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Check if organization has associated users
    const userCount = await User.countDocuments({ organizationId });
    if (userCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete organization with ${userCount} associated users. Transfer or delete these users first.` 
      });
    }
    
    // Delete the organization
    await Organization.findByIdAndDelete(organizationId);
    
    res.json({ message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('Delete organization error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/organizations/:id/users
// @desc     Get all users for an organization
// @access   Private + Admin or SuperAdmin
router.get('/:id/users', [authMiddleware, adminMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const organizationId = req.params.id;
    const { role, status, search, page = 1, limit = 20 } = req.query;
    
    // For non-superadmins, ensure they can only access their organization
    if (req.user.role !== 'superadmin' && 
        (!req.user.organizationId || req.user.organizationId.toString() !== organizationId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Build query
    const query = { organizationId };
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('clientId', 'name email');
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Get organization users error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/organizations/:id/with-admins
// @desc     Get organization by ID with its admin users
// @access   Private + SuperAdmin or same organization
router.get('/:id/with-admins', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // For non-superadmins, ensure they can only access their organization
    if (req.user.role !== 'superadmin' && 
        (!req.user.organizationId || req.user.organizationId.toString() !== organizationId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get the organization
    const organization = await Organization.findById(organizationId)
      .populate('createdBy', 'name email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Find admin users for this organization
    const adminUsers = await User.find({ 
      organizationId: organizationId,
      role: 'admin'
    }).select('-password');
    
    // Combine the data and send response
    const response = {
      ...organization.toObject(),
      admins: adminUsers
    };
    
    res.json(response);
  } catch (err) {
    console.error('Get organization with admins error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/organizations/current
// @desc     Get the current user's organization
// @access   Private
router.get('/current', authMiddleware, async (req, res) => {
  try {
    // If user doesn't have an organization ID, return 404
    if (!req.user.organizationId) {
      return res.status(404).json({ message: 'No organization associated with your account' });
    }
    
    // Get the organization
    const organization = await Organization.findById(req.user.organizationId)
      .populate('createdBy', 'name email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (err) {
    console.error('Get current user organization error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route    GET /api/organizations/:id/stats
// @desc     Get organization statistics for admin dashboard
// @access   Private + Admin
router.get('/:id/stats', [authMiddleware, sameOrganizationMiddleware], async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // Verify user has access to this organization
    if (req.user.role !== 'superadmin' && 
        (!req.user.organizationId || req.user.organizationId.toString() !== organizationId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Get user counts from the database
    const User = mongoose.model('User');
    
    // Get total client count
    const totalClients = await User.countDocuments({ 
      organizationId, 
      role: 'client' 
    });
    
    // Get active client count
    const activeClients = await User.countDocuments({ 
      organizationId, 
      role: 'client',
      status: 'active'
    });
    
    // Get total dealer count
    const totalDealers = await User.countDocuments({ 
      organizationId, 
      role: 'dealer' 
    });
    
    // Get active dealer count
    const activeDealers = await User.countDocuments({ 
      organizationId, 
      role: 'dealer',
      status: 'active'
    });
    
    // Return statistics
    res.json({
      totalClients,
      activeClients,
      totalDealers,
      activeDealers,
      organization: {
        name: organization.name,
        status: organization.status
      }
    });
  } catch (err) {
    console.error('Get organization stats error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 