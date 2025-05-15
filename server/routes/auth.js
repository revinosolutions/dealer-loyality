import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import config from '../config.js';

const router = express.Router();

// Get User model
const User = mongoose.model('User');

// Login route
router.post('/login', [
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
    // Find user by email and populate organization with more fields
    console.log(`Login attempt with email: ${email}`);
    const user = await User.findOne({ email })
      .populate('organizationId', 'name status settings description logo contactInfo createdAt');
      
    if (!user) {
      console.log(`Login failed: No user found with email ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`User found: ${user.name}, role: ${user.role}, status: ${user.status}`);
    
    // Check if this is the permanent superadmin account
    const isPermanentSuperadmin = email === 'superadmin@revino.com' || user.isPermanentSuperadmin === true;
    
    // Special handling for permanent superadmin
    if (isPermanentSuperadmin) {
      console.log(`Permanent superadmin account detected: ${email}`);
      
      // Ensure superadmin account is always active
      if (user.status !== 'active') {
        console.log(`Fixing inactive status for permanent superadmin account: ${email}`);
        user.status = 'active';
        await user.save();
      }
      
      // Ensure superadmin role is set correctly
      if (user.role !== 'superadmin') {
        console.log(`Fixing incorrect role for permanent superadmin account: ${email}`);
        user.role = 'superadmin';
        await user.save();
      }
      
      // Verify password for superadmin - special check ensuring the correct password is always accepted
      console.log(`Verifying password for permanent superadmin ${email}`);
      let isMatch = false;
      if (password === 'password123') {
        // If the correct hardcoded password is used, ensure it works
        // This is a special case to ensure the superadmin can always log in
        console.log(`Using hardcoded password for permanent superadmin`);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash('password123', salt);
        await user.save();
        isMatch = true;
      } else {
        // Otherwise check password normally
        isMatch = await user.comparePassword(password);
      }
      
      if (!isMatch) {
        console.log(`Login failed: Invalid password for permanent superadmin ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    } else {
      // Normal checks for non-superadmin users
      // Check if user is active
      if (user.status !== 'active') {
        console.log(`Login failed: User ${email} account is ${user.status}`);
        return res.status(403).json({ message: 'Your account is currently ' + user.status });
      }
      
      // Check if organization is active (if user belongs to an organization)
      if (user.organizationId && user.organizationId.status !== 'active') {
        console.log(`Login failed: Organization for user ${email} is not active`);
        return res.status(403).json({ 
          message: 'Your organization account is not active. Please contact the administrator.' 
        });
      }

      // Check if admin account is restricted to login-only
      if (user.role === 'admin' && user.createdBySuperAdmin) {
        // Only allow login for admin accounts created by superadmin
        // No additional restrictions needed here as role-based middleware
        // will handle access control to specific routes
      }

      // Check if client was created by an admin
      if (user.role === 'client' && !user.createdByAdmin) {
        return res.status(403).json({ message: 'Access denied. Only clients created by admins can login.' });
      }
      
      // Check if dealer was created by a client
      if (user.role === 'dealer' && !user.createdByClient) {
        return res.status(403).json({ message: 'Access denied. Only dealers created by clients can login.' });
      }

      // Check password
      console.log(`Verifying password for user ${email}`);
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log(`Login failed: Invalid password for user ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }

    console.log(`Login successful for user ${email}`);

    // Generate JWT tokens
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId._id : null
      }
    };

    const accessToken = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiration }
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiration }
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: 'strict'
    });

    // Update user's last active time
    user.stats.lastActive = new Date();
    await user.save();

    // Prepare organization info with more details if available
    const organization = user.organizationId ? {
      id: user.organizationId._id,
      name: user.organizationId.name,
      status: user.organizationId.status,
      description: user.organizationId.description,
      logo: user.organizationId.logo,
      contactInfo: user.organizationId.contactInfo,
      createdAt: user.organizationId.createdAt,
      settings: user.organizationId.settings
    } : null;

    // Prepare user object for response (omit password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      avatar: user.avatar,
      phone: user.phone,
      company: user.company,
      notificationPreferences: user.notificationPreferences,
      stats: user.stats,
      clientId: user.clientId,
      status: user.status,
      organization: organization,
      createdBySuperAdmin: user.createdBySuperAdmin,
      createdByAdmin: user.createdByAdmin,
      createdByClient: user.createdByClient
    };

    // Return user and token
    res.json({
      token: accessToken,
      user: userResponse
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register route
router.post('/register', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('role', 'Role is required').isIn(['client', 'dealer'])
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, clientId, phone } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // For public registration, only allow dealer registration
    // Client accounts can only be created by admins
    if (role === 'client') {
      return res.status(403).json({ 
        message: 'Client accounts can only be created by an administrator.' 
      });
    }
    
    // For dealer registration, require a valid clientId
    if (role === 'dealer') {
      if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required for dealer registration.' });
      }

      const client = await User.findById(clientId);
      if (!client || client.role !== 'client') {
        return res.status(400).json({ message: 'Invalid client ID.' });
      }
      
      // Public dealer registration is not allowed, must be created by a client
      return res.status(403).json({
        message: 'Dealer accounts can only be created by clients.'
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password, // Will be hashed in the pre-save hook
      role,
      phone,
      clientId: role === 'dealer' ? clientId : undefined,
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

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    const accessToken = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiration }
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiration }
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Prepare user object for response (omit password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      avatar: user.avatar,
      phone: user.phone,
      company: user.company,
      notificationPreferences: user.notificationPreferences,
      stats: user.stats,
      clientId: user.clientId,
      status: user.status
    };

    // Return user and token
    res.json({
      token: accessToken,
      user: userResponse
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Generate new access token
    const payload = {
      user: {
        id: decoded.user.id,
        role: decoded.user.role
      }
    };

    const accessToken = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiration }
    );

    // Return new access token
    res.json({ token: accessToken });
  } catch (err) {
    console.error('Token refresh error:', err);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Get current user route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Find user by ID from auth middleware and populate organization
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('clientId', 'name email')
      .populate('organizationId', 'name status settings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update last active time
    user.stats.lastActive = new Date();
    await user.save();
    
    // Format organization data if exists
    const userResponse = {
      ...user.toObject(),
      organization: user.organizationId ? {
        id: user.organizationId._id,
        name: user.organizationId.name,
        settings: user.organizationId.settings
      } : null
    };
    
    // Remove the organizationId field to avoid duplication
    delete userResponse.organizationId;

    res.json(userResponse);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile route
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatar, notificationPreferences } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }

    user.updatedAt = Date.now();
    await user.save();

    // Return updated user (minus password)
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password route
router.put('/change-password', authMiddleware, [
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// Check token route
router.get('/check-token', authMiddleware, async (req, res) => {
  try {
    // The authMiddleware already checks if the token is valid and user exists
    // If we reach here, it means the token is valid
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is valid, but user no longer exists' });
    }
    
    return res.json({ 
      valid: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Token check error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router; 