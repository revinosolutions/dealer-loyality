import jwt from 'jsonwebtoken';
import config from '../server/config.js';

// Verify JWT token middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. Required role: ' + roles.join(' or ')
      });
    }
    next();
  };
};

// Client access middleware
export const authorizeClientAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
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