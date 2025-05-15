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

// Define the User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId
});

async function checkClientRequests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Create models
    const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);
    const User = mongoose.model('User', userSchema);

    // Get all purchase requests
    const requests = await PurchaseRequest.find({});
    console.log(`Found ${requests.length} purchase requests in the database`);
    
    // Get all clients
    const clients = await User.find({ role: 'client' });
    console.log(`Found ${clients.length} clients in the database`);
    
    // Get all admin users
    const admins = await User.find({ role: 'admin' });
    console.log(`Found ${admins.length} admin users in the database`);
    
    // Check each admin's organization
    console.log('\n--- Admin Organizations ---');
    for (const admin of admins) {
      console.log(`Admin: ${admin.email}, Organization: ${admin.organizationId}`);
      
      // Find clients in this admin's organization
      const orgClients = clients.filter(client => 
        client.organizationId && admin.organizationId && 
        client.organizationId.toString() === admin.organizationId.toString()
      );
      
      console.log(`Found ${orgClients.length} clients in this admin's organization`);
      
      // Get client IDs
      const clientIds = orgClients.map(client => client._id.toString());
      
      // Find purchase requests from these clients
      const orgRequests = requests.filter(req => 
        clientIds.includes(req.clientId.toString())
      );
      
      console.log(`Found ${orgRequests.length} purchase requests from clients in this organization`);
      
      if (orgRequests.length > 0) {
        console.log('Purchase request details:');
        orgRequests.forEach((req, index) => {
          console.log(`  ${index + 1}. Product: ${req.productName}, Client: ${req.clientName}, Status: ${req.status}`);
        });
      }
      
      console.log('----------------------------');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkClientRequests(); 