import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function fixSuperadminPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Define constants
    const superadminEmail = 'superadmin@revino.com';
    const superadminPassword = 'password123';
    
    // Get the User collection directly (not the User model)
    // This bypasses Mongoose hooks
    const usersCollection = mongoose.connection.collection('users');
    
    // Find superadmin user
    console.log(`Looking for superadmin with email: ${superadminEmail}`);
    const superadmin = await usersCollection.findOne({ email: superadminEmail });
    
    if (superadmin) {
      console.log(`Found superadmin user with ID: ${superadmin._id}`);
      
      // Hash the password
      console.log('Hashing password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(superadminPassword, salt);
      
      // Update the user directly in the database
      console.log('Updating password directly in database...');
      const result = await usersCollection.updateOne(
        { email: superadminEmail },
        { 
          $set: { 
            password: hashedPassword,
            role: 'superadmin',
            status: 'active',
            isPermanentSuperadmin: true
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Password updated successfully');
      } else {
        console.log('⚠️ No changes made to the user');
      }
      
      // Verify the password
      const updatedUser = await usersCollection.findOne({ email: superadminEmail });
      console.log('Testing password verification...');
      const isMatch = await bcrypt.compare(superadminPassword, updatedUser.password);
      console.log(`Password verification result: ${isMatch ? 'Successful ✅' : 'Failed ❌'}`);
      
      // Show credentials
      console.log('\nSuperadmin credentials:');
      console.log(`- Email: ${superadminEmail}`);
      console.log(`- Password: ${superadminPassword}`);
    } else {
      console.log('No superadmin user found! Please run the set-permanent-superadmin script first.');
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error fixing superadmin password:', error);
    process.exit(1);
  }
}

// Run the fix
fixSuperadminPassword(); 