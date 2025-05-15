import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import config from '../server/config.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const validateRegister = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'client', 'dealer'])
    .withMessage('Invalid role specified'),
];

// Login route
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Ensure consistent token format with payload containing 'id'
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiration }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        avatar: user.avatar,
        phone: user.phone,
        clientId: user.clientId,
        notificationPreferences: user.notificationPreferences,
        stats: user.stats
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register route
router.post('/register', validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, clientId, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'dealer',
      clientId: role === 'dealer' ? clientId : undefined,
      phone,
    });

    await user.save();

    // Use the same token format as login
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiration }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        avatar: user.avatar,
        phone: user.phone,
        clientId: user.clientId,
        notificationPreferences: user.notificationPreferences,
        stats: user.stats
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        points: req.user.points,
        avatar: req.user.avatar,
        phone: req.user.phone,
        clientId: req.user.clientId,
        company: req.user.company,
        notificationPreferences: req.user.notificationPreferences,
        stats: req.user.stats
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update profile route
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatar, notificationPreferences } = req.body;
    
    const user = req.user;
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (notificationPreferences) user.notificationPreferences = {
      ...user.notificationPreferences,
      ...notificationPreferences
    };
    
    user.updatedAt = new Date();
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        avatar: user.avatar,
        phone: user.phone,
        clientId: user.clientId,
        company: user.company,
        notificationPreferences: user.notificationPreferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user clients (for admin)
router.get('/clients', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only endpoint.' });
    }
    
    const clients = await User.find({ role: 'client' })
      .select('name email phone avatar company stats');
      
    res.json({ clients });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user dealers (for client)
router.get('/dealers', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied. Admin or client only endpoint.' });
    }
    
    const query = req.user.role === 'client' ? { clientId: req.user._id } : {};
    
    const dealers = await User.find({ role: 'dealer', ...query })
      .select('name email phone avatar clientId company stats')
      .populate('clientId', 'name email');
      
    res.json({ dealers });
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle undefined authMiddleware routes
router.use((req, res) => {
  res.status(404).json({ message: 'Auth endpoint not found' });
});

export default router;
