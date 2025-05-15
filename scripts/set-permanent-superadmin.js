import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function setPermanentSuperadmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // The User model is already imported at the top
    console.log('Using User model...');
    
    // Define the superadmin credentials we want to ensure exist
    const superadminEmail = 'superadmin@revino.com';
    const superadminPassword = 'password123';

    console.log(`Checking for existing superadmin user with email: ${superadminEmail}`);
    const existingSuperadmin = await User.findOne({ email: superadminEmail });

    // If a user with this email exists but isn't a superadmin or has different password, update it
    if (existingSuperadmin) {
      console.log('Found existing user with this email.');
      
      // Hash the password for comparison
      const isPasswordMatch = await bcrypt.compare(superadminPassword, existingSuperadmin.password);
      
      if (existingSuperadmin.role !== 'superadmin' || existingSuperadmin.status !== 'active' || !isPasswordMatch || !existingSuperadmin.isPermanentSuperadmin) {
        console.log('Updating existing user to ensure correct role, status, and password...');
        
        // Only hash password if it doesn't match
        if (!isPasswordMatch) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(superadminPassword, salt);
          existingSuperadmin.password = hashedPassword;
          console.log('Password updated to correct value');
        }
        
        // Update other attributes
        existingSuperadmin.role = 'superadmin';
        existingSuperadmin.status = 'active';
        existingSuperadmin.isPermanentSuperadmin = true;
        
        await existingSuperadmin.save();
        console.log('Existing user updated to superadmin with correct credentials');
      } else {
        console.log('Superadmin already exists with correct role, status, and password');
      }
    } else {
      // Create a new superadmin if no user with this email exists
      console.log('No user found with this email. Creating new superadmin...');
      
      const newSuperadmin = new User({
        name: 'Super Admin',
        email: superadminEmail,
        password: superadminPassword, // Will be hashed by the pre-save hook
        role: 'superadmin',
        status: 'active',
        isPermanentSuperadmin: true,
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

      await newSuperadmin.save();
      console.log('Created new superadmin with specified credentials');
    }

    console.log('\n✅ Permanent superadmin configured successfully');
    console.log('Superadmin credentials:');
    console.log('- Email: superadmin@revino.com');
    console.log('- Password: password123');
    console.log('This superadmin is now protected by the User model safeguards');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error setting permanent superadmin:', error);
    process.exit(1);
  }
}

// Run the setup function
setPermanentSuperadmin(); 