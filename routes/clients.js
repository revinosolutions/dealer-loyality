import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authMiddleware, authorize } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateClientInput = [
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

// Get all clients
router.get('/', [authMiddleware, authorize(['super_admin', 'admin'])], async (req, res) => {
  try {
    console.log("Fetching all clients...");
    const clients = await User.find({ role: 'client' }).select('-password');
    console.log(`Found ${clients.length} clients`);
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client by ID
router.get('/:id', [authMiddleware, authorize(['super_admin', 'admin'])], async (req, res) => {
  try {

    const client = await User.findOne({ _id: req.params.id, role: 'client' }).select('-password');
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new client
router.post('/', [authMiddleware, authorize(['super_admin', 'admin']), validateClientInput], async (req, res) => {
  try {
    console.log("Creating new client...");
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, company, address, status } = req.body;

    // Check if client already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Get admin's organizationId
    const organizationId = req.user.organizationId;
    console.log(`Using admin's organizationId: ${organizationId} for new client`);

    if (!organizationId) {
      console.error('Admin user does not have an organizationId');
      return res.status(400).json({ message: 'Admin organization not found, cannot create client' });
    }

    // Create new client
    const client = new User({
      name,
      email,
      password,
      role: 'client',
      phone,
      company,
      address,
      status,
      createdByAdmin: true,
      organizationId // Set the organization ID from the admin
    });

    await client.save();

    // Return client without password
    const clientResponse = client.toObject();
    delete clientResponse.password;

    console.log(`Client created successfully: ${email}`);
    res.status(201).json(clientResponse);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client
router.put('/:id', [authMiddleware, authorize(['super_admin', 'admin']), validateClientInput], async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, company, address, status } = req.body;

    // Check if client exists
    let client = await User.findOne({ _id: req.params.id, role: 'client' });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if email is being changed and if it's already in use
    if (email !== client.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update client fields
    client.name = name;
    client.email = email;
    client.phone = phone;
    client.company = company;
    client.address = address;
    client.status = status;
    client.updatedAt = Date.now();

    // Update password if provided
    if (password) {
      client.password = password;
    }

    await client.save();

    // Return client without password
    const clientResponse = client.toObject();
    delete clientResponse.password;

    res.json(clientResponse);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete client
router.delete('/:id', [authMiddleware, authorize(['super_admin', 'admin'])], async (req, res) => {
  try {

    const client = await User.findOneAndDelete({ _id: req.params.id, role: 'client' });
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
