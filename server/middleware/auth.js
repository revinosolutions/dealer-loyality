import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config.js';

// Get user model
let User;
try {
  User = mongoose.model('User');
} catch (error) {
  // Define the User schema if it doesn't exist yet
  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    // Other user fields...
  });
  
  User = mongoose.model('User', userSchema);
}

// Middleware to authenticate user using JWT
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header, handle multiple formats
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    } else if (!token) {
      token = req.header('x-auth-token');
    }
    
    if (!token) {
      console.error('No authentication token provided in request');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    // Log token for debugging (truncated for security)
    console.log(`Auth middleware processing token: ${token.substring(0, 20)}...`);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
      console.log('Decoded token payload:', decoded);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Extract user ID from different possible payload formats
    const userId = decoded.id || (decoded.user && decoded.user.id);
    if (!userId) {
      console.error('No user ID found in token payload:', decoded);
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    // Find user by id
    const user = await User.findById(userId);
    
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      return res.status(401).json({ message: 'Token is valid, but user no longer exists' });
    }
    
    console.log(`User found: ${user.email} (${user.role})`);
    
    if (user.status !== 'active' && user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Your account is not active. Please contact the administrator.' });
    }
      // Add user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      // If user is a client, ensure clientId is set to their own ID for proper access control
      clientId: user.role === 'client' ? (user.clientId || user._id.toString()) : user.clientId,
      createdBySuperAdmin: user.createdBySuperAdmin,
      createdByAdmin: user.createdByAdmin,
      createdByClient: user.createdByClient
    };
    
    // Special handling for client role to ensure they have their own ID as clientId
    if (user.role === 'client' && !user.clientId) {
      console.log(`Client user ${user.email} missing clientId, setting to their own ID`);
      // Update the user record to include clientId if missing
      await User.findByIdAndUpdate(user._id, { clientId: user._id.toString() });
    }
    
    // Update last active timestamp
    try {
      if (typeof user.updateActivity === 'function') {
        await user.updateActivity();
      }
    } catch (activityError) {
      console.error('Failed to update user activity, but continuing with request:', activityError);
      // Don't block the request if activity update fails
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Middleware to restrict access to admin and superadmin only
const adminMiddleware = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Middleware to restrict access to superadmin only
const superAdminMiddleware = (req, res, next) => {
  if (req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
  }
};

// Middleware to restrict access to client or higher roles
const clientMiddleware = (req, res, next) => {
  if (['client', 'admin', 'superadmin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Client privileges required.' });
  }
};

// Middleware to restrict access to dealer role
const dealerMiddleware = (req, res, next) => {
  if (req.user.role === 'dealer') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Dealer privileges required.' });
  }
};

// Middleware to restrict admin accounts created by super admins to login only
const restrictAdminCreatedBySuperAdmin = (req, res, next) => {
  if (req.user.role === 'admin' && req.user.createdBySuperAdmin) {
    return res.status(403).json({ 
      message: 'As an admin created by a super admin, you are restricted to login only.'
    });
  }
  next();
};

// Middleware to restrict client accounts to be created only by admins
const restrictAdminCreatedClients = (req, res, next) => {
  if (req.user.role === 'client' && !req.user.createdByAdmin) {
    return res.status(403).json({ 
      message: 'Invalid client account. Client accounts must be created by an admin.'
    });
  }
  next();
};

// Middleware to restrict dealer accounts to be created only by clients
const restrictClientCreatedDealers = (req, res, next) => {
  if (req.user.role === 'dealer' && !req.user.createdByClient) {
    return res.status(403).json({ 
      message: 'Invalid dealer account. Dealer accounts must be created by a client.'
    });
  }
  next();
};

// Middleware to verify users belong to the same organization
const sameOrganizationMiddleware = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    
    // Superadmins can access all organizations
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    // For other users, check the target user's organization
    let targetOrganizationId;
    
    // Get the target user ID from various possible sources in the request
    const targetUserId = req.params.userId || req.body.userId || req.query.userId;
    
    if (targetUserId) {
      const targetUser = await User.findById(targetUserId).select('organizationId');
      if (targetUser) {
        targetOrganizationId = targetUser.organizationId;
      }
    }
    
    // Check organization from body if specified directly
    if (!targetOrganizationId && req.body.organizationId) {
      targetOrganizationId = req.body.organizationId;
    }
    
    // If we found a target organization, verify it matches
    if (targetOrganizationId && organizationId && 
        targetOrganizationId.toString() !== organizationId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. You can only interact with users in your organization.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Organization check error:', error);
    res.status(500).json({ message: 'Server error during organization validation' });
  }
};

// Middleware to restrict superadmin from creating admins
const restrictSuperAdminCreatedAdmins = (req, res, next) => {
  // Check if the request is trying to create a new admin by a superadmin
  if (req.user.role === 'superadmin' && req.body.role === 'admin' && req.body.createdBySuperAdmin) {
    return res.status(403).json({ 
      message: 'Creation of admin accounts by superadmins is restricted in this context.'
    });
  }
  next();
};

// Middleware to verify user ownership or admin privileges
const userOwnershipMiddleware = (req, res, next) => {
  const userId = req.params.id || req.params.userId;
  
  // Allow access if user is accessing their own data
  if (req.user.id.toString() === userId) {
    return next();
  }
  
  // Allow access for admins and superadmins
  if (['admin', 'superadmin'].includes(req.user.role)) {
    return next();
  }
  
  // Allow clients to access their dealers
  if (req.user.role === 'client') {
    // In a complete implementation, you would check if the target user is a dealer
    // and belongs to this client. For this example, we'll just check the role.
    User.findById(userId).select('role clientId')
      .then(user => {
        if (user && user.role === 'dealer' && user.clientId && 
            user.clientId.toString() === req.user.id) {
          next();
        } else {
          res.status(403).json({ message: 'Access denied. Not your dealer.' });
        }
      })
      .catch(err => {
        console.error('User ownership check error:', err);
        res.status(500).json({ message: 'Server error' });
      });
  } else {
    // Deny access for all other cases
    res.status(403).json({ message: 'Access denied. Not authorized.' });
  }
};

export { 
  authMiddleware, 
  adminMiddleware, 
  superAdminMiddleware,
  clientMiddleware,
  dealerMiddleware,
  restrictAdminCreatedBySuperAdmin,
  restrictAdminCreatedClients,
  restrictClientCreatedDealers,
  sameOrganizationMiddleware,
  userOwnershipMiddleware,
  restrictSuperAdminCreatedAdmins
}; 