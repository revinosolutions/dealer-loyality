import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateDealerInput = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .if(body('_id').not().exists())
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone').optional(),
  body('company.name').optional(),
  body('company.position').optional(),
  body('address.city').optional(),
  body('address.state').optional(),
  body('address.country').optional(),
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
];

// Get all dealers for the client
router.get('/', [authMiddleware, authorize(['client'])], async (req, res) => {
  try {
    // Find all dealers created by this client
    const dealers = await User.find({ 
      role: 'dealer',
      clientId: req.user._id
    }).select('-password');

    res.json(dealers);
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dealer by ID
router.get('/:id', [authMiddleware, authorize(['client'])], async (req, res) => {
  try {
    // Find dealer by ID and ensure it belongs to the current client
    const dealer = await User.findOne({ 
      _id: req.params.id, 
      role: 'dealer',
      clientId: req.user._id
    }).select('-password');
    
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    res.json(dealer);
  } catch (error) {
    console.error('Error fetching dealer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new dealer
router.post('/', [authMiddleware, authorize(['client']), validateDealerInput], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, company, address, status, organizationId } = req.body;
    
    // Log key information for debugging
    console.log('Creating dealer with information:', {
      name,
      email,
      requestUser: {
        id: req.user.id,
        _id: req.user._id,
        role: req.user.role,
        organizationId: req.user.organizationId
      },
      providedOrganizationId: organizationId
    });

    // Check if dealer already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User with this email already exists:', email);
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Determine which organizationId to use
    const dealerOrgId = organizationId || req.user.organizationId;
    if (!dealerOrgId) {
      console.error('No organization ID available');
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Ensure the client ID is set correctly
    // Use consistent ID format (req.user.id is a string, req.user._id is an ObjectId)
    const clientId = req.user.id || req.user._id.toString();

    // Create new dealer with clientId set to the current client's user ID
    const dealer = new User({
      name,
      email,
      password,
      role: 'dealer',
      phone,
      company,
      address,
      status: status || 'active',
      clientId: clientId,
      organizationId: dealerOrgId,
      createdByClient: true
    });

    console.log('Dealer model created, about to save:', {
      dealerId: dealer._id,
      clientId: dealer.clientId,
      organizationId: dealer.organizationId
    });

    await dealer.save();

    // Return dealer without password
    const dealerResponse = dealer.toObject();
    delete dealerResponse.password;
    
    console.log('Dealer created successfully:', {
      id: dealerResponse._id,
      email: dealerResponse.email
    });
    
    res.status(201).json(dealerResponse);
  } catch (error) {
    console.error('Error creating dealer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update dealer
router.put('/:id', [authMiddleware, authorize(['client']), validateDealerInput], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, company, address, status } = req.body;

    // Check if dealer exists and belongs to this client
    let dealer = await User.findOne({ 
      _id: req.params.id, 
      role: 'dealer',
      clientId: req.user._id
    });
    
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    // Check if email is being changed and if it's already in use
    if (email !== dealer.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update dealer fields
    dealer.name = name;
    dealer.email = email;
    dealer.phone = phone;
    dealer.company = company;
    dealer.address = address;
    dealer.status = status;
    dealer.updatedAt = Date.now();

    // Update password if provided
    if (password) {
      dealer.password = password;
    }

    await dealer.save();

    // Return dealer without password
    const dealerResponse = dealer.toObject();
    delete dealerResponse.password;

    res.json(dealerResponse);
  } catch (error) {
    console.error('Error updating dealer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete dealer
router.delete('/:id', [authMiddleware, authorize(['client'])], async (req, res) => {
  try {
    // Delete dealer only if it belongs to this client
    const dealer = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: 'dealer',
      clientId: req.user._id
    });
    
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    res.json({ message: 'Dealer deleted successfully' });
  } catch (error) {
    console.error('Error deleting dealer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change dealer status (activate/deactivate/suspend)
router.patch('/:id/status', [
  authMiddleware, 
  authorize(['client']),
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    // Update dealer status only if it belongs to this client
    const dealer = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        role: 'dealer',
        clientId: req.user._id
      },
      { status, updatedAt: Date.now() },
      { new: true }
    ).select('-password');
    
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    res.json(dealer);
  } catch (error) {
    console.error('Error updating dealer status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 