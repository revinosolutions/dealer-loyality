import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import User model
import '../models/User.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get User model
    const User = mongoose.model('User');
    
    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ email: 'superadmin@revino.com' });
    if (existingSuperAdmin) {
      console.log('Deleting existing superadmin user...');
      await User.deleteOne({ email: 'superadmin@revino.com' });
    }

    // Hash the password directly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create a new superadmin with the hashed password
    const superadmin = new User({
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: hashedPassword, // Already hashed password
      role: 'superadmin',
      status: 'active',
      phone: '+1234567000',
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

    // Save the user without triggering the pre-save password hashing
    superadmin.$__save = superadmin.save; // Store the original save method
    superadmin.save = function(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = options || {};
      
      // Skip all middleware
      return this.constructor.collection.insertOne(this, options).then(result => {
        if (callback) callback(null, this);
        return this;
      }).catch(err => {
        if (callback) callback(err);
        throw err;
      });
    };

    await superadmin.save();
    console.log('Created superadmin user:');
    console.log('- Email: superadmin@revino.com');
    console.log('- Password: password123');
    
    console.log('\nSuperadmin created successfully. You can now log in with these credentials.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
createSuperAdmin(); 