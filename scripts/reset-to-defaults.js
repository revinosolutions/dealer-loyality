import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Set MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[33m%s\x1b[0m', '⚠️  WARNING: This script will reset the database to default state!');
console.log('\x1b[33m%s\x1b[0m', '⚠️  Database URI:', MONGODB_URI);
console.log('\x1b[33m%s\x1b[0m', '⚠️  All existing data will be removed and only default data will be reinitialized!');

rl.question('\x1b[31m%s\x1b[0m', 'Are you sure you want to proceed? Type "RESET TO DEFAULTS" to confirm: ', async (answer) => {
  if (answer !== 'RESET TO DEFAULTS') {
    console.log('Operation cancelled. No changes were made.');
    rl.close();
    process.exit(0);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    // Drop each collection
    console.log('Dropping all collections...');
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`Dropped collection: ${collection.name}`);
    }

    console.log('All collections dropped successfully');

    // Import models to ensure they're registered with Mongoose
    console.log('Importing models...');
    const { default: models } = await import('../models/index.js');
    console.log('Models imported successfully');

    // Initialize database with default data
    console.log('Initializing database with default data...');
    
    // Import the User and Organization models
    const User = mongoose.model('User');
    const Organization = mongoose.model('Organization');
    const Product = mongoose.model('Product');
    
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
    console.log('Default organization created with ID:', savedOrg._id);
    
    // Create default users
    console.log('Creating default users...');
    const defaultAdmin = await User.createDefaultUsers(savedOrg._id);
    console.log('Default users created');
    
    // Create default products
    console.log('Creating default products...');
    if (defaultAdmin) {
      await Product.createDefaultProducts(savedOrg._id, defaultAdmin._id);
      console.log('Default products created');
    }
    
    console.log('\x1b[32m%s\x1b[0m', '✅ Database has been successfully reset to defaults!');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error resetting database:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    rl.close();
    process.exit(0);
  }
}); 