import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function resetAllCollections() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get a list of all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in the database.`);

    // Create temporary User schema without hooks
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      status: String,
      phone: String,
      avatar: String,
      company: Object,
      stats: Object,
      notificationPreferences: Object,
      isPermanentSuperadmin: Boolean,
      createdAt: Date,
      updatedAt: Date
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Save existing superadmin data if it exists
    console.log('Looking for existing superadmin user...');
    const existingSuperadmin = await User.findOne({ email: 'superadmin@revino.com' });
    
    let superadminPassword = 'password123';
    if (existingSuperadmin) {
      console.log('Found existing superadmin user');
      superadminPassword = existingSuperadmin.password;
    } else {
      console.log('No existing superadmin found, will create a new one');
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      superadminPassword = await bcrypt.hash('password123', salt);
    }

    // Drop all collections
    console.log('\nDropping all collections...');
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Dropping collection: ${collectionName}`);
      await mongoose.connection.db.dropCollection(collectionName);
    }
    console.log('All collections have been dropped successfully.');

    // Create Organization schema and model
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
      createdAt: Date,
      updatedAt: Date
    });
    
    const Organization = mongoose.model('Organization', organizationSchema);
    
    // Create default organization
    console.log('\nCreating default organization...');
    const defaultOrg = new Organization({
      name: 'Revino Global',
      description: 'Default organization created during system reset',
      status: 'active',
      settings: {
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedOrg = await defaultOrg.save();
    console.log('Default organization created successfully.');

    // Create a proper User schema with bcrypt hook
    delete mongoose.models.User;
    
    const fullUserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['superadmin', 'admin', 'client', 'dealer'], default: 'dealer' },
      status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
      phone: String,
      avatar: { type: String, default: '/images/avatars/superadmin.jpg' },
      organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
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
      isPermanentSuperadmin: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    // Add password hashing middleware
    fullUserSchema.pre('save', async function(next) {
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
    
    const FullUser = mongoose.model('User', fullUserSchema);
    
    // Create new superadmin user
    console.log('\nRecreating superadmin user...');
    
    // Create superadmin without triggering password hash (since we already have a hashed password)
    const newSuperadmin = {
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: superadminPassword, // Either existing hash or newly generated hash
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
        whatsapp: false
      },
      isPermanentSuperadmin: true,
      organizationId: savedOrg._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert directly to avoid bcrypt hashing again
    await mongoose.connection.db.collection('users').insertOne(newSuperadmin);
    
    console.log('\nSuperadmin user has been created successfully:');
    console.log('- Email: superadmin@revino.com');
    console.log('- Password: password123');
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ Database has been reset successfully! Only the superadmin user remains.');
    console.log('\x1b[32m%s\x1b[0m', 'You can now log in and start fresh with a clean database.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error during database reset:');
    console.error(error);
    process.exit(1);
  }
}

// Execute the reset function
resetAllCollections(); 