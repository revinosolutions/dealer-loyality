import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Function to drop the entire database
async function dropDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Get database name from the connection URI
    const dbName = MONGODB_URI.split('/').pop().split('?')[0];
    console.log(`Preparing to drop database: ${dbName}`);
    
    // Drop the entire database
    console.log('Dropping database...');
    await mongoose.connection.dropDatabase();
    
    console.log('\x1b[32m%s\x1b[0m', `✅ Database '${dbName}' has been successfully dropped!`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error dropping database:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Execute the function
dropDatabase(); 