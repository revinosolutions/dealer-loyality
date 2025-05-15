import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

// Define the PurchaseRequest schema
const purchaseRequestSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  productName: String,
  clientId: mongoose.Schema.Types.ObjectId,
  clientName: String,
  adminId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  price: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  notes: String,
  rejectionReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

async function checkPurchaseRequests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Create model
    const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

    // Get all purchase requests
    const requests = await PurchaseRequest.find({});
    console.log(`Found ${requests.length} purchase requests in the database:`);
    
    if (requests.length > 0) {
      requests.forEach((req, index) => {
        console.log(`\n--- Request ${index + 1} ---`);
        console.log(`ID: ${req._id}`);
        console.log(`Product: ${req.productName} (${req.productId})`);
        console.log(`Client: ${req.clientName} (${req.clientId})`);
        console.log(`Quantity: ${req.quantity}`);
        console.log(`Price: ${req.price}`);
        console.log(`Status: ${req.status}`);
        console.log(`Created: ${req.createdAt}`);
        console.log(`Notes: ${req.notes || 'None'}`);
      });
    } else {
      console.log('No purchase requests found in the database.');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkPurchaseRequests(); 