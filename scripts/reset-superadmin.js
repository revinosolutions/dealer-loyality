import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function resetSuperadmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Import User model directly from the models directory
    const userSchemaPath = join(__dirname, '..', 'models', 'User.js');
    let User;
    
    if (fs.existsSync(userSchemaPath)) {
      console.log('Importing User model from:', userSchemaPath);
      const userModule = await import(userSchemaPath);
      User = userModule.default;
    } else {
      console.error(`User schema not found at ${userSchemaPath}`);
      
      // Define a minimal User schema if the file doesn't exist
      console.log('Creating a minimal User schema');
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
        notificationPreferences: Object
      });
      
      // Hash password before saving
      userSchema.pre('save', async function(next) {
        if (this.isModified('password')) {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
        }
        next();
      });
      
      User = mongoose.model('User', userSchema);
    }
    
    // Find all superadmin users
    console.log('Finding superadmin users...');
    const superadmins = await User.find({ role: 'superadmin' });
    console.log(`Found ${superadmins.length} superadmin users`);
    
    // Delete them all
    if (superadmins.length > 0) {
      console.log('Deleting existing superadmin users...');
      await User.deleteMany({ role: 'superadmin' });
      console.log('Deleted all superadmin users');
    }

    // Create a new superadmin
    console.log('Creating new superadmin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
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

    await newSuperadmin.save();
    console.log('Created new superadmin user:');
    console.log('- Email: superadmin@revino.com');
    console.log('- Password: admin123');
    
    console.log('\nSuperadmin reset successful. You can now log in with these credentials.');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
resetSuperadmin(); 