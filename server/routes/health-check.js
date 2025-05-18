// Simple health check route
import express from 'express';

const router = express.Router();

// @route    GET /api/health-check
// @desc     Health check endpoint for API connectivity testing
// @access   Public
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'API is operational'
  });
});

export default router;
