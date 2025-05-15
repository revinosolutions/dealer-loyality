import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main function
async function initializeSuperadmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Check if any users exist
    let existingCollections = await mongoose.connection.db.listCollections().toArray();
    const userCollectionExists = existingCollections.some(c => c.name === 'users');
    
    if (userCollectionExists) {
      const confirmOverwrite = await askQuestion('\nUser collection already exists. Do you want to proceed anyway? (y/n): ');
      if (confirmOverwrite.toLowerCase() !== 'y') {
        console.log('Operation cancelled. No changes were made.');
        return;
      }
    }
    
    // Create Organization model and schema
    console.log('\nCreating Organization model...');
    const organizationSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      status: { type: String, enum: ['active', 'inactive'], default: 'active' },
      settings: {
        theme: {
          primaryColor: { type: String, default: '#2563eb' },
          secondaryColor: { type: String, default: '#1e40af' }
        }
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { timestamps: true });
    
    // Clear existing model if it exists
    if (mongoose.models.Organization) {
      delete mongoose.models.Organization;
    }
    
    const Organization = mongoose.model('Organization', organizationSchema);
    
    // Create User model and schema
    console.log('Creating User model...');
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['superadmin', 'admin', 'client', 'dealer'], default: 'admin' },
      status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
      phone: String,
      avatar: String,
      company: {
        name: String,
        position: String
      },
      stats: {
        totalSales: { type: Number, default: 0 },
        contestsWon: { type: Number, default: 0 },
        contestsParticipated: { type: Number, default: 0 },
        rewardsRedeemed: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now }
      },
      notificationPreferences: {
        app: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false }
      },
      organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { timestamps: true });
    
    // Add password hashing
    userSchema.pre('save', async function(next) {
      if (this.isModified('password')) {
        try {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
          console.log(`Password hashed successfully for ${this.email}`);
        } catch (error) {
          console.error('Error hashing password:', error);
          return next(error);
        }
      }
      next();
    });
    
    // Add method to verify password
    userSchema.methods.comparePassword = async function(candidatePassword) {
      try {
        return await bcrypt.compare(candidatePassword, this.password);
      } catch (error) {
        throw error;
      }
    };
    
    // Clear existing model if it exists
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
    
    const User = mongoose.model('User', userSchema);
    
    // Get superadmin details from user input
    console.log('\n--- Superadmin Creation ---');
    let email = await askQuestion('Enter email for superadmin (default: superadmin@revino.com): ');
    if (!email) email = 'superadmin@revino.com';
    
    let password = await askQuestion('Enter password for superadmin (default: admin123): ');
    if (!password) password = 'admin123';
    
    let name = await askQuestion('Enter name for superadmin (default: Super Admin): ');
    if (!name) name = 'Super Admin';
    
    let orgName = await askQuestion('Enter organization name (default: Revino Global): ');
    if (!orgName) orgName = 'Revino Global';
    
    // Create a default organization
    console.log('\nCreating default organization...');
    const newOrg = new Organization({
      name: orgName,
      description: 'Default organization created during initialization',
      status: 'active',
      settings: {
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af'
        }
      }
    });
    
    const savedOrg = await newOrg.save();
    console.log('Organization created successfully with ID:', savedOrg._id);
    
    // Create superadmin user
    console.log('\nCreating superadmin user...');
    const newSuperadmin = new User({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: 'superadmin',
      status: 'active',
      phone: '+1234567000',
      avatar: '/images/avatars/superadmin.jpg',
      company: {
        name: orgName,
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
      },
      organizationId: savedOrg._id
    });
    
    const superadmin = await newSuperadmin.save();
    console.log('Superadmin created successfully with ID:', superadmin._id);
    
    // Verify the user was created
    const verifyUser = await User.findOne({ email });
    if (verifyUser) {
      console.log('\nSuperadmin user verified in database:');
      console.log('- ID:', verifyUser._id);
      console.log('- Email:', verifyUser.email);
      console.log('- Role:', verifyUser.role);
      console.log('- Organization ID:', verifyUser.organizationId);
    } else {
      console.error('FAILED TO VERIFY SUPERADMIN USER - NOT FOUND IN DATABASE');
      return;
    }
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ Initialization complete! Superadmin user created successfully.');
    console.log('\x1b[32m%s\x1b[0m', 'You can now log in with the following credentials:');
    console.log('\x1b[32m%s\x1b[0m', `- Email: ${email}`);
    console.log('\x1b[32m%s\x1b[0m', `- Password: ${password}`);
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error initializing superadmin:');
    console.error(error);
  } finally {
    // Close connections
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    rl.close();
    process.exit(0);
  }
}

// Run the initialization function
initializeSuperadmin(); 