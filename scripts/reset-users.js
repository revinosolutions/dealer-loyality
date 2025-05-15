import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function resetUsers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get User model - try to delete the model first to prevent any pre-save hooks
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }

    // Create a simple schema without hooks
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      status: String,
      phone: String,
      stats: Object,
      notificationPreferences: Object
    });
    
    const User = mongoose.model('User', userSchema);

    // Delete all existing users
    console.log('Deleting all existing users...');
    await User.deleteMany({});
    console.log('All users deleted successfully');

    // Create a single superadmin user
    const superadmin = new User({
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: 'password123', // Plain text password as requested
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

    await superadmin.save();
    console.log('Created new superadmin user:');
    console.log('- Email/Username: superadmin@revino.com');
    console.log('- Password: password123');
    
    console.log('\nReset completed successfully. You can now use the superadmin account to create other users.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the reset function
resetUsers(); 