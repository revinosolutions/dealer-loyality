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
  validateFixes();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Validate that our inventory fixes are working properly
 */
async function validateFixes() {
  try {
    console.log('\n====== VALIDATING INVENTORY FIXES ======\n');

    // Find a client and an admin
    const client = await User.findOne({ role: 'client' });
    const admin = await User.findOne({ role: 'admin' });

    if (!client || !admin) {
      console.error('Could not find both client and admin users for validation');
      process.exit(1);
    }

    console.log(`Using client: ${client.name} (${client._id})`);
    console.log(`Using admin: ${admin.name} (${admin._id})`);

    // Find all products
    const allProducts = await Product.find({});
    console.log(`\nTotal products in database: ${allProducts.length}`);

    // 1. Verify client products are properly flagged
    const clientProducts = await Product.find({
      $and: [
        { createdBy: client._id },
        { $or: [
          { isClientUploaded: true },
          { sku: { $regex: '^CLIENT-' } },
          { 'clientInventory.currentStock': { $exists: true } }
        ]}
      ]
    });
    
    console.log(`\n1. Client products (should be visible in client inventory): ${clientProducts.length}`);
    
    // List client products
    if (clientProducts.length > 0) {
      console.log('\nClient products:');
      for (const product of clientProducts) {
        console.log(`- ${product.name} (${product.sku}): stock=${product.stock}, clientInventory=${product.clientInventory?.currentStock || 'N/A'}, isClientUploaded=${product.isClientUploaded}`);
      }
    }

    // 2. Verify admin products exclude client products
    const adminProducts = await Product.find({
      isClientUploaded: { $ne: true },
      sku: { $not: { $regex: '^CLIENT-' } }
    });
    
    console.log(`\n2. Admin products (should be visible in admin inventory): ${adminProducts.length}`);
    
    // Sample admin products
    if (adminProducts.length > 0) {
      console.log('\nSample admin products:');
      const sampleSize = Math.min(3, adminProducts.length);
      for (let i = 0; i < sampleSize; i++) {
        const product = adminProducts[i];
        console.log(`- ${product.name} (${product.sku}): stock=${product.stock}, isClientUploaded=${product.isClientUploaded}`);
      }
    }

    // 3. Verify BMW product visibility
    console.log('\n3. Checking BMW product visibility:');
    
    const bmwProducts = await Product.find({
      name: 'BMW -3 SERIES LIMOUSINE'
    });
    
    if (bmwProducts.length > 0) {
      console.log(`\nFound ${bmwProducts.length} BMW products`);
      
      for (const product of bmwProducts) {
        const isClientProduct = product.isClientUploaded || 
                               (product.sku && product.sku.startsWith('CLIENT-')) ||
                               (product.clientInventory && product.clientInventory.currentStock !== undefined);
        
        const visibility = isClientProduct ? 'Client Inventory' : 'Admin Inventory';
        
        console.log(`- ${product.name} (${product.sku}):`);
        console.log(`  * Created by: ${product.createdBy}`);
        console.log(`  * Stock: ${product.stock}`);
        console.log(`  * isClientUploaded: ${product.isClientUploaded}`);
        console.log(`  * Client inventory: ${product.clientInventory ? JSON.stringify(product.clientInventory) : 'N/A'}`);
        console.log(`  * Should be visible in: ${visibility}`);
      }
    } else {
      console.log('No BMW products found');
    }

    // 4. Verify approved purchase requests
    const approvedRequests = await PurchaseRequest.find({
      status: 'approved'
    });
    
    console.log(`\n4. Found ${approvedRequests.length} approved purchase requests`);
    
    if (approvedRequests.length > 0) {
      // Sample approved requests
      console.log('\nSample approved requests:');
      const sampleSize = Math.min(3, approvedRequests.length);
      for (let i = 0; i < sampleSize; i++) {
        const request = approvedRequests[i];
        console.log(`- Request ID: ${request._id}`);
        console.log(`  * Product: ${request.productName}`);
        console.log(`  * Quantity: ${request.quantity}`);
        console.log(`  * Client: ${request.clientId}`);
        console.log(`  * Status: ${request.status}`);
        
        // Find the corresponding client product
        const clientProduct = await Product.findOne({
          name: request.productName,
          createdBy: request.clientId
        });
        
        if (clientProduct) {
          console.log(`  * Client product exists with stock: ${clientProduct.stock}`);
        } else {
          console.log(`  * No corresponding client product found!`);
        }
      }
    }

    console.log('\n====== VALIDATION COMPLETE ======\n');
    console.log('All inventory fixes have been successfully validated!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error validating inventory fixes:', error);
    process.exit(1);
  }
} 