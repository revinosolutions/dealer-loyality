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

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[33m%s\x1b[0m', '⚠️  WARNING: This script will delete ALL data except the superadmin user!');
console.log('\x1b[33m%s\x1b[0m', 'All products, orders, users, and other data will be permanently deleted.');

rl.question('\x1b[31m%s\x1b[0m ', 'Are you sure you want to proceed? Type "DELETE ALL DATA" to confirm: ', async (answer) => {
  if (answer !== 'DELETE ALL DATA') {
    console.log('Operation cancelled. No changes were made.');
    rl.close();
    process.exit(0);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Store superadmin info if it exists
    let superadminEmail = 'superadmin@revino.com';
    let superadminExists = false;
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);
    
    // Drop all collections except system collections
    console.log('Dropping all collections...');
    for (const collection of collections) {
      if (!collection.name.startsWith('system.')) {
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`Dropped collection: ${collection.name}`);
      }
    }

    console.log('All collections dropped successfully');
    
    // Create Organization model and schema
    const organizationSchema = new mongoose.Schema({
      name: String,
      description: String,
      status: String,
      settings: {
        theme: {
          primaryColor: String,
          secondaryColor: String
        }
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { timestamps: true });
    
    const Organization = mongoose.model('Organization', organizationSchema);
    
    // Create a default organization
    console.log('Creating default organization...');
    const newOrg = new Organization({
      name: 'Default Organization',
      description: 'Default organization created during system reset',
      status: 'active',
      settings: {
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af'
        }
      }
    });
    
    const savedOrg = await newOrg.save();
    console.log('Created default organization with ID:', savedOrg._id);
    
    // Create comprehensive User schema
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
    
    // Create the User model
    const User = mongoose.model('User', userSchema);
    
    // Create superadmin user directly with hashed password
    console.log('Creating superadmin user...');
    
    // Hash password manually to avoid any potential issues with middleware
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    console.log('Password hashed successfully');
    
    const newSuperadmin = new User({
      name: 'Super Admin',
      email: superadminEmail,
      password: hashedPassword, // Use pre-hashed password
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
      },
      organizationId: savedOrg._id
    });
    
    // Disable the pre-save hook for this operation
    const superadmin = await User.create(newSuperadmin);
    console.log('Superadmin created with ID:', superadmin._id);
    
    // Verify the user was saved correctly
    const verifyUser = await User.findOne({ email: superadminEmail });
    if (verifyUser) {
      console.log('Superadmin user verified in database');
      console.log('- ID:', verifyUser._id);
      console.log('- Email:', verifyUser.email);
      console.log('- Password is hashed:', verifyUser.password.startsWith('$'));
    } else {
      console.error('FAILED TO VERIFY SUPERADMIN USER - NOT FOUND IN DATABASE');
    }
    
    console.log('Superadmin user created successfully');
    console.log('- Email:', superadminEmail);
    console.log('- Password: admin123');
    
    console.log('\x1b[32m%s\x1b[0m', '✅ Database reset complete! All data has been deleted except for the superadmin user.');
    console.log('\x1b[32m%s\x1b[0m', 'You can now log in with the superadmin credentials shown above.');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error resetting database:');
    console.error(error);
  } finally {
    // Close connections
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    rl.close();
    process.exit(0);
  }
}); 