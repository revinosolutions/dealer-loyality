import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

// Import models first to ensure they're registered
import models from '../models/index.js';

// Import services
import { processNotificationQueue } from '../services/notificationDeliveryService.js';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import organizationsRoutes from './routes/organizations.js';
import adminRoutes from './routes/admin.js';
import contestRoutes from './routes/contests.js';
import orderRoutes from './routes/orders.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import rewardRoutes from './routes/rewards.js';
import achievementRoutes from './routes/achievements.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import dealerSlotRoutes from './routes/dealerSlots.js';
import clientOrderRoutes from './routes/clientOrders.js';
import dealerOrderRoutes from './routes/dealerOrders.js';
import clientsRoutes from '../routes/clients.js';
import dealersRoutes from '../routes/dealers.js';
import productsRoutes from './routes/products.js';
import healthCheckRoutes from './routes/health-check.js';
import clientRequestsRoutes from './routes/client-requests.js';
import clientOnlyRoutes from './routes/client-only.js';
import loyaltyRoutes from './routes/loyalty.js';

// Config
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: ['http://localhost:3000'], // Only allow port 3000 for frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};
app.use(cors(corsOptions));
console.log('CORS configured with options:', corsOptions);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Set MongoDB URI from environment or use provided string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// MongoDB Connection
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
  initializeDatabase();
})
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dealer-slots', dealerSlotRoutes);
app.use('/api/client-orders', clientOrderRoutes);
app.use('/api/dealer-orders', dealerOrderRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/dealers', dealersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/health-check', healthCheckRoutes);
app.use('/api/client-requests', clientRequestsRoutes);
app.use('/api/client-only', clientOnlyRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

// Initialize database with default data
async function initializeDatabase() {
  try {
    console.log('Initializing database with default data...');
    
    // Import models
    const User = mongoose.model('User');
    const Organization = mongoose.model('Organization');
    
    // Check if we need to create default users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Create a default organization first
      const defaultOrg = await Organization.findOne({ name: 'Default Organization' });
      
      let orgId;
      if (!defaultOrg) {
        const newOrg = new Organization({
          name: 'Default Organization',
          description: 'Default organization created during system initialization',
          status: 'active',
          settings: {
            theme: {
              primaryColor: '#2563eb',
              secondaryColor: '#1e40af'
            }
          }
        });
        
        const savedOrg = await newOrg.save();
        orgId = savedOrg._id;
        console.log('Default organization created');
      } else {
        orgId = defaultOrg._id;
      }
      
      // Create default users using the model's static method
      await User.createDefaultUsers(orgId);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start notification processing scheduler
  startNotificationScheduler();
});

/**
 * Start the notification processing scheduler
 * This will process pending notifications every 5 minutes
 */
function startNotificationScheduler() {
  console.log('Starting notification processing scheduler...');
  
  // Process notifications immediately on server start
  processNotificationQueue().catch(err => {
    console.error('Error in initial notification processing:', err);
  });
  
  // Set up interval to process notifications every 5 minutes
  const FIVE_MINUTES = 5 * 60 * 1000;
  setInterval(() => {
    console.log('Running scheduled notification processing...');
    processNotificationQueue().catch(err => {
      console.error('Error in scheduled notification processing:', err);
    });
  }, FIVE_MINUTES);
  
  console.log('Notification scheduler started successfully');
}

export default app;




