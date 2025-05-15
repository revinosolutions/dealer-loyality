import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from './config.js';

// Import models
import '../models/User.js';
import '../models/Contest.js';
import '../models/Product.js';
import '../models/Order.js';
import '../models/Sales.js';
import '../models/Achievement.js';
import '../models/Reward.js';
import '../models/Notification.js';
import '../models/Inventory.js';

const User = mongoose.model('User');

// Connect to MongoDB
export const connectDB = async () => {
  try {
    const options = config.mongodb.options;
    
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri, options);
    
    console.log('MongoDB Connected...');
    
    // Create default users if none exist
    await createDefaultUsers();
    
    return true;
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Create default users if none exist
const createDefaultUsers = async () => {
  const count = await User.countDocuments();
  
  if (count === 0) {
    console.log('Creating default superadmin user...');
    
    // Create super admin user
    const superadmin = new User({
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: 'password123',
      role: 'superadmin',
      phone: '+1234567000',
      avatar: '/images/avatars/superadmin.jpg',
      company: {
        name: 'Revino Global',
        position: 'Super Administrator'
      },
      stats: {
        totalSales: 0,
        contestsWon: 0,
        contestsParticipated: 0,
        rewardsRedeemed: 0,
        lastActive: new Date()
      }
    });
    
    await superadmin.save();
    
    console.log('Default superadmin user created successfully');
  }
};

export default connectDB; 