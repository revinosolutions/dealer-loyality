import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Models
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
  displayApprovedStock();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Display approved stock data from the database
 */
async function displayApprovedStock() {
  try {
    console.log('\n====== APPROVED STOCK DATA ======\n');

    // Find all approved purchase requests
    const approvedRequests = await PurchaseRequest.find({ status: 'approved' })
      .populate('productId', 'name sku stock')
      .populate('clientId', 'name email company')
      .sort({ updatedAt: -1 });

    console.log(`Found ${approvedRequests.length} approved purchase requests\n`);

    if (approvedRequests.length === 0) {
      console.log('No approved purchase requests found.');
    } else {
      // Display table header
      console.log('ID | Product | Client | Quantity | Approval Date');
      console.log('-'.repeat(80));

      // Display each approved request
      for (const request of approvedRequests) {
        const productName = request.productName || (request.productId && request.productId.name) || 'Unknown';
        const clientName = request.clientName || (request.clientId && request.clientId.name) || 'Unknown';
        const quantity = request.quantity || 0;
        const approvalDate = request.updatedAt ? request.updatedAt.toISOString().split('T')[0] : 'Unknown';

        console.log(`${request._id} | ${productName} | ${clientName} | ${quantity} | ${approvalDate}`);
      }

      // Fetch admin products with reduced stock
      console.log('\n\n====== ADMIN PRODUCTS WITH REDUCED STOCK ======\n');

      // Aggregate product IDs from approved requests
      const productIds = approvedRequests
        .map(request => request.productId && request.productId._id)
        .filter(id => id); // Filter out null/undefined

      // Find admin products by IDs
      const adminProducts = await Product.find({
        _id: { $in: productIds },
        isClientUploaded: { $ne: true }
      });

      console.log(`Found ${adminProducts.length} admin products with reduced stock\n`);

      if (adminProducts.length > 0) {
        // Display table header
        console.log('ID | Product | Current Stock | Reorder Level');
        console.log('-'.repeat(80));

        // Display each admin product
        for (const product of adminProducts) {
          console.log(`${product._id} | ${product.name} | ${product.stock} | ${product.reorderLevel}`);
        }
      }

      // Find client products with increased stock
      console.log('\n\n====== CLIENT PRODUCTS WITH INCREASED STOCK ======\n');

      const clientProducts = await Product.find({
        isClientUploaded: true
      }).sort({ 'clientInventory.lastUpdated': -1 });

      console.log(`Found ${clientProducts.length} client products with increased stock\n`);

      if (clientProducts.length > 0) {
        // Display table header
        console.log('ID | Product | Client Stock | Last Updated');
        console.log('-'.repeat(80));

        // Display each client product
        for (const product of clientProducts) {
          const clientStock = product.clientInventory?.currentStock || 0;
          const lastUpdated = product.clientInventory?.lastUpdated 
            ? product.clientInventory.lastUpdated.toISOString().split('T')[0] 
            : 'Unknown';
          
          console.log(`${product._id} | ${product.name} | ${clientStock} | ${lastUpdated}`);
        }
      }
    }

    console.log('\n====== END OF REPORT ======\n');
    process.exit(0);
  } catch (error) {
    console.error('Error displaying approved stock data:', error);
    process.exit(1);
  }
} 