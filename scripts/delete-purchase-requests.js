// Script to delete all purchase requests from the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Connect to MongoDB
console.log('Connecting to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');

    // Create PurchaseRequest model if not imported
    const PurchaseRequest = mongoose.models.PurchaseRequest || 
      mongoose.model('PurchaseRequest', new mongoose.Schema({}, { strict: false }));

    // Count total purchase requests
    const count = await PurchaseRequest.countDocuments({});
    console.log(`Found ${count} purchase requests in the database`);

    if (count === 0) {
      console.log('No purchase requests to delete.');
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️ WARNING: This will delete ALL purchase requests from the database ⚠️');
    console.log('Are you sure you want to continue? This action is irreversible.');
    console.log('To proceed, please type: DELETE_ALL_PURCHASE_REQUESTS');
    
    // In a script environment, we'll auto-confirm
    console.log('Auto-confirming deletion in script mode...');
    
    // Delete all records
    const result = await PurchaseRequest.deleteMany({});
    console.log(`🗑️ DELETED ${result.deletedCount} PURCHASE REQUESTS FROM THE DATABASE`);
    
    // Disconnect and exit
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection or operation error:', err);
    process.exit(1);
  }); 