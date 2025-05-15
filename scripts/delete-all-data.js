import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Set MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[33m%s\x1b[0m', '⚠️  WARNING: This script will delete ALL data from the database!');
console.log('\x1b[33m%s\x1b[0m', '⚠️  Database URI:', MONGODB_URI);
console.log('\x1b[33m%s\x1b[0m', '⚠️  This action is IRREVERSIBLE!');

rl.question('\x1b[31m%s\x1b[0m', 'Are you sure you want to proceed? Type "DELETE ALL DATA" to confirm: ', async (answer) => {
  if (answer !== 'DELETE ALL DATA') {
    console.log('Operation cancelled. No data was deleted.');
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
    console.log('Starting to delete all collections...');
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`Dropped collection: ${collection.name}`);
    }

    console.log('\x1b[32m%s\x1b[0m', '✅ All data has been successfully deleted!');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error deleting data:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    rl.close();
    process.exit(0);
  }
}); 