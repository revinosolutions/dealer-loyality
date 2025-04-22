import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import './db.js';
import config from './config.js';

// Import routes
import authRoutes from '../routes/auth.js';
import contestsRoutes from '../routes/contests.js';
import salesRoutes from '../routes/sales.js';
import statsRoutes from '../routes/stats.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use(config.apiEndpoints.auth, authRoutes);
app.use(config.apiEndpoints.contests, contestsRoutes);
app.use(config.apiEndpoints.sales, salesRoutes);
app.use(config.apiEndpoints.stats, statsRoutes);

// Handle undefined routes
app.use((req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});