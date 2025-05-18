import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import './models/Product.js';
import './models/PurchaseRequest.js';
import './models/User.js';

const Product = mongoose.model('Product');
const PurchaseRequest = mongoose.model('PurchaseRequest');
const User = mongoose.model('User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolt-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  testClientInventoryAPI();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Test the client inventory API by simulating API calls with direct database queries
 */
async function testClientInventoryAPI() {
  try {
    console.log('\n====== CLIENT INVENTORY API TEST ======\n');

    // 1. Find a client user
    const client = await User.findOne({ role: 'client' });
    if (!client) {
      console.error('No client user found for testing');
      process.exit(1);
    }
    console.log(`Found client user: ${client.name} (${client._id})`);

    // 2. Simulate the client inventory endpoint
    console.log('\n--- Fetching Client Inventory ---\n');
    
    // Get client's inventory products
    const clientProducts = await Product.find({
      createdBy: client._id,
      isClientUploaded: true
    }).sort({ 'clientInventory.lastUpdated': -1 });

    console.log(`Found ${clientProducts.length} client products`);
    
    // Get client's approved purchase requests
    const approvedRequests = await PurchaseRequest.find({
      clientId: client._id,
      status: 'approved'
    })
    .populate('productId', 'name sku price images category')
    .sort({ updatedAt: -1 });

    console.log(`Found ${approvedRequests.length} approved purchase requests`);

    // Calculate total approved stock
    let totalApprovedStock = 0;
    clientProducts.forEach(product => {
      totalApprovedStock += product.clientInventory?.currentStock || 0;
    });

    console.log(`Total approved stock: ${totalApprovedStock}`);

    // Display client products
    console.log('\n--- Client Products with Approved Stock ---\n');
    if (clientProducts.length > 0) {
      console.log('ID | Product | Stock | Last Updated');
      console.log('-'.repeat(80));
      
      for (const product of clientProducts) {
        const stock = product.clientInventory?.currentStock || 0;
        const lastUpdated = product.clientInventory?.lastUpdated 
          ? product.clientInventory.lastUpdated.toISOString().split('T')[0] 
          : 'Unknown';
        
        console.log(`${product._id} | ${product.name} | ${stock} | ${lastUpdated}`);
      }
    } else {
      console.log('No client products found');
    }

    // Display approved requests
    console.log('\n--- Approved Purchase Requests ---\n');
    if (approvedRequests.length > 0) {
      console.log('ID | Product | Quantity | Price | Approval Date');
      console.log('-'.repeat(80));
      
      for (const request of approvedRequests) {
        const productName = request.productName || (request.productId && request.productId.name) || 'Unknown';
        const quantity = request.quantity || 0;
        const price = request.price ? `$${request.price.toFixed(2)}` : 'N/A';
        const approvalDate = request.updatedAt ? request.updatedAt.toISOString().split('T')[0] : 'Unknown';
        
        console.log(`${request._id} | ${productName} | ${quantity} | ${price} | ${approvalDate}`);
      }
    } else {
      console.log('No approved purchase requests found');
    }

    console.log('\n====== END OF CLIENT INVENTORY TEST ======\n');
    process.exit(0);
  } catch (error) {
    console.error('Error testing client inventory API:', error);
    process.exit(1);
  }
} 