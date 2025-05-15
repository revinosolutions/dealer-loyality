import jwt from 'jsonwebtoken';
import config from '../server/config.js';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    console.log('Auth Middleware: Checking authorization header');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.error('Auth Middleware: No token provided in headers');
      console.log('Headers received:', req.headers);
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }
    
    console.log('Auth Middleware: Token found, verifying...');
    // Use the correct secret from config
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user ID from the decoded token (handle both formats)
    const userId = decoded.id || (decoded.user && decoded.user.id) || decoded._id;
    
    if (!userId) {
      console.error('Auth Middleware: Invalid token format, no user ID found');
      console.log('Decoded token:', decoded);
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    console.log(`Auth Middleware: Token verified, looking up user with ID: ${userId}`);
    // Find the user by ID
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error(`Auth Middleware: User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Attach user to request object with BOTH id formats to prevent issues
    req.user = {
      _id: user._id,
      id: user._id.toString(),  // Ensure string format for MongoDB ObjectId
      role: user.role,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      clientId: user.clientId,
      createdByAdmin: user.createdByAdmin,
      createdBySuperAdmin: user.createdBySuperAdmin,
      createdByClient: user.createdByClient,
      status: user.status
    };
    
    console.log(`Auth Middleware: User authenticated: ${user.email} with role ${user.role}`);
    console.log(`Auth Middleware: User ID formats: _id=${req.user._id}, id=${req.user.id}`);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error('Auth Middleware: Invalid token error:', error.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      console.error('Auth Middleware: Token expired error');
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Auth Middleware: Unexpected error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user has specific role
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('Authorization failed: No user object in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`Authorizing user: ${req.user.email} with role "${req.user.role}" against allowed roles:`, roles);
    
    if (!roles.includes(req.user.role)) {
      console.error(`Access denied for user ${req.user.email} with role ${req.user.role}. Required roles: ${roles.join(', ')}`);
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    
    console.log(`User ${req.user.email} authorized for access with role ${req.user.role}`);
    next();
  };
};

export default { authMiddleware, authorize };

// Client access middleware
export const authorizeClientAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const resourceClientId = req.body.clientId || req.query.clientId;
    
    if (req.user.role === 'client' && req.user.id !== resourceClientId) {
      return res.status(403).json({
        message: 'Access denied. You can only access your own resources'
      });
    }

    if (req.user.role === 'dealer' && req.user.clientId !== resourceClientId) {
      return res.status(403).json({
        message: 'Access denied. You can only access resources from your client'
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};