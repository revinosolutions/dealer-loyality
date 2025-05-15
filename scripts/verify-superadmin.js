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

async function verifySuperadmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Find the superadmin
    const superadminEmail = 'superadmin@revino.com';
    console.log(`Looking for superadmin with email: ${superadminEmail}`);
    
    const superadmin = await User.findOne({ email: superadminEmail });
    
    if (superadmin) {
      console.log('Found superadmin user:');
      console.log(`- ID: ${superadmin._id}`);
      console.log(`- Name: ${superadmin.name}`);
      console.log(`- Email: ${superadmin.email}`);
      console.log(`- Role: ${superadmin.role}`);
      console.log(`- Status: ${superadmin.status}`);
      console.log(`- Is Permanent: ${superadmin.isPermanentSuperadmin ? 'Yes' : 'No'}`);
      
      // Check if password matches
      const testPassword = 'password123';
      const passwordMatches = await bcrypt.compare(testPassword, superadmin.password);
      console.log(`- Password matches 'password123': ${passwordMatches ? 'Yes' : 'No'}`);
      
      // If password doesn't match, show hashed version for troubleshooting
      if (!passwordMatches) {
        console.log(`- Current hashed password: ${superadmin.password}`);
        
        // Generate what the hash should be
        const salt = await bcrypt.genSalt(10);
        const correctHash = await bcrypt.hash(testPassword, salt);
        console.log(`- New hash for 'password123': ${correctHash}`);
      }
      
      // Show all superadmin users
      const allSuperadmins = await User.find({ role: 'superadmin' });
      console.log(`\nTotal superadmin users in database: ${allSuperadmins.length}`);
      
      if (allSuperadmins.length > 1) {
        console.log('\nAll superadmin users:');
        for (const admin of allSuperadmins) {
          console.log(`- ${admin.email} (ID: ${admin._id})`);
        }
      }
    } else {
      console.log('No superadmin user found with that email!');
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error verifying superadmin:', error);
    process.exit(1);
  }
}

// Run the verification
verifySuperadmin(); 