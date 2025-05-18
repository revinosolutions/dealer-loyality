import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import models
import '../models/Product.js';
import '../models/PurchaseRequest.js';
import '../models/Order.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function fixProductInventory() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Access models
    const Product = mongoose.model('Product');
    const PurchaseRequest = mongoose.model('PurchaseRequest');
    const Order = mongoose.model('Order');
    
    // Get all products with low or zero stock
    const products = await Product.find({ 
      stock: { $lt: 10 },
      isClientUploaded: { $ne: true }  // Only admin products
    });
    
    console.log(`Found ${products.length} admin products with low stock`);
    
    // Add some stock to each product
    for (const product of products) {
      const previousStock = product.stock;
      product.stock = Math.max(50, previousStock + 50); // Ensure at least 50 units
      
      await product.save();
      
      console.log(`Updated product ${product.name} (${product._id}): Stock ${previousStock} -> ${product.stock}`);
    }
    
    // Check pending purchase requests
    const pendingRequests = await PurchaseRequest.find({ status: 'pending' });
    console.log(`\nFound ${pendingRequests.length} pending purchase requests`);
    
    if (pendingRequests.length > 0) {
      console.log('\nPending Purchase Requests:');
      for (const request of pendingRequests) {
        const product = await Product.findById(request.productId);
        
        console.log(`- Request ID: ${request._id}`);
        console.log(`  Product: ${request.productName || 'Unknown'} (${request.productId})`);
        console.log(`  Client: ${request.clientName || 'Unknown'} (${request.clientId})`);
        console.log(`  Quantity: ${request.quantity}`);
        console.log(`  Product available stock: ${product ? product.stock : 'Product not found'}`);
        console.log(`  Can be approved: ${product && product.stock >= request.quantity ? 'Yes' : 'No'}`);
        console.log('');
      }
    }
    
    // Check client products
    const clientProducts = await Product.find({ 
      isClientUploaded: true,
      'clientInventory.currentStock': { $exists: true }
    });
    
    console.log(`\nFound ${clientProducts.length} client products`);
    
    if (clientProducts.length > 0) {
      console.log('\nClient Products:');
      for (const product of clientProducts) {
        console.log(`- Product: ${product.name} (${product._id})`);
        console.log(`  Client: ${product.createdBy}`);
        console.log(`  Current Stock: ${product.clientInventory.currentStock}`);
        console.log('');
      }
    }
    
    console.log('\nInventory check and fix completed successfully');
  } catch (err) {
    console.error('Error fixing product inventory:', err);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fixProductInventory(); 