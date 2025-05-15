import mongoose from 'mongoose';
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

console.log('\x1b[31m%s\x1b[0m', '🚨 DANGER: This script will DELETE ALL DATA including superadmin users!');
console.log('\x1b[31m%s\x1b[0m', 'The database will be completely reset to a clean state.');
console.log('\x1b[31m%s\x1b[0m', 'You will need to run the initialization script afterward to create a new superadmin.');

rl.question('\x1b[31m%s\x1b[0m ', 'Are you sure you want to proceed? Type "ERASE EVERYTHING" to confirm: ', async (answer) => {
  if (answer !== 'ERASE EVERYTHING') {
    console.log('Operation cancelled. No changes were made.');
    rl.close();
    process.exit(0);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Get database name from the connection URI
    const dbName = MONGODB_URI.split('/').pop().split('?')[0];
    console.log(`Preparing to drop database: ${dbName}`);
    
    // Get all collection names first for logging
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to drop:`);
    
    for (const collection of collections) {
      console.log(`- ${collection.name}`);
    }
    
    // Drop the entire database
    console.log('\nDropping entire database...');
    await mongoose.connection.dropDatabase();
    
    console.log('\n\x1b[32m%s\x1b[0m', `✅ Database '${dbName}' has been completely erased!`);
    console.log('\x1b[33m%s\x1b[0m', 'There are no users in the system. You will need to run an initialization script to create a new superadmin user.');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error dropping database:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    rl.close();
    process.exit(0);
  }
}); 