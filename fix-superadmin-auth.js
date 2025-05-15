import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function fixSuperadminAuth() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Define the user schema directly to avoid import issues
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: String,
      status: String,
      phone: String,
      avatar: String,
      company: {
        name: String,
        position: String
      },
      stats: {
        totalSales: Number,
        contestsWon: Number,
        contestsParticipated: Number,
        rewardsRedeemed: Number,
        lastActive: Date
      },
      notificationPreferences: {
        app: Boolean,
        email: Boolean,
        whatsapp: Boolean
      }
    });
    
    // Create or get the User model
    let User;
    try {
      // Try to get existing model
      User = mongoose.model('User');
    } catch (e) {
      // Create new model if it doesn't exist
      User = mongoose.model('User', userSchema);
    }
    
    // Delete all superadmin users first
    console.log('Finding and deleting all superadmin users...');
    const deletedUsers = await User.deleteMany({ role: 'superadmin' });
    console.log(`Deleted ${deletedUsers.deletedCount} superadmin users`);

    // Create a new superadmin with the correct credentials
    console.log('Creating new superadmin user with correct credentials...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const newSuperadmin = new User({
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: hashedPassword,
      role: 'superadmin',
      status: 'active',
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
      },
      notificationPreferences: {
        app: true,
        email: true,
        whatsapp: true
      }
    });

    const savedSuperadmin = await newSuperadmin.save();
    console.log('Created superadmin with the following credentials:');
    console.log('- Email: superadmin@revino.com');
    console.log('- Password: password123');

    // Load the JWT secret from config
    const jwtSecret = process.env.JWT_SECRET || 'dealer-loyalty-secret-key';
    
    // Generate a sample token to verify the format
    const payload = {
      id: savedSuperadmin._id,
      role: 'superadmin'
    };
    
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log('Sample token for testing:');
    console.log(token);
    
    // Verify the token works
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('Token verification successful. Decoded payload:');
      console.log(decoded);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
    }
    
    console.log('\nSuperadmin reset successful. You can now log in with these credentials.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error fixing superadmin auth:', error);
    process.exit(1);
  }
}

// Run the fix function
fixSuperadminAuth(); 