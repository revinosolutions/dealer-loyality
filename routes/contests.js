import express from 'express';
import { body, validationResult } from 'express-validator';
import Contest from '../models/Contest.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateContest = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('goal').notEmpty().withMessage('Goal is required'),
  body('reward').notEmpty().withMessage('Reward is required'),
];

// Get all contests
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // Filter contests based on user role and clientId
    if (req.user.role === 'dealer') {
      query.clientId = req.user.clientId;
    } else if (req.user.role === 'client') {
      query.clientId = req.user.id;
    }

    const contests = await Contest.find(query).sort({ startDate: -1 });
    res.json(contests);
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get contest by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Check if user has access to this contest
    if (req.user.role === 'dealer' && contest.clientId.toString() !== req.user.clientId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(contest);
  } catch (error) {
    console.error('Get contest error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new contest
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['super_admin', 'client']),
  validateContest,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const contest = new Contest({
        ...req.body,
        clientId: req.user.role === 'client' ? req.user.id : req.body.clientId,
        status: 'upcoming',
      });

      await contest.save();
      res.status(201).json(contest);
    } catch (error) {
      console.error('Create contest error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Update contest
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['super_admin', 'client']),
  validateContest,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const contest = await Contest.findById(req.params.id);
      if (!contest) {
        return res.status(404).json({ message: 'Contest not found' });
      }

      // Check if client is updating their own contest
      if (req.user.role === 'client' && contest.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      Object.assign(contest, req.body);
      await contest.save();
      res.json(contest);
    } catch (error) {
      console.error('Update contest error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete contest
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['super_admin', 'client']),
  async (req, res) => {
    try {
      const contest = await Contest.findById(req.params.id);
      if (!contest) {
        return res.status(404).json({ message: 'Contest not found' });
      }

      // Check if client is deleting their own contest
      if (req.user.role === 'client' && contest.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await contest.deleteOne();
      res.json({ message: 'Contest deleted successfully' });
    } catch (error) {
      console.error('Delete contest error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Handle undefined contest routes
router.use((req, res) => {
  res.status(404).json({ message: 'Contest endpoint not found' });
});

export default router;