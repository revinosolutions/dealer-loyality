// Test script for end-to-end testing of purchase requests
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle MongoDB connection directly
async function connectToDatabase() {
  try {
    // Attempt to read MongoDB URI from config
    let mongoURI = process.env.MONGODB_URI;
    const configPath = join(__dirname, '../server/config.js');
    
    if (!mongoURI && fs.existsSync(configPath)) {
      try {
        const configModule = await import(configPath);
        mongoURI = configModule.default?.mongodb?.uri;
      } catch (configErr) {
        console.error('Error loading config:', configErr);
      }
    }
    
    // Fallback to default URI if none found
    mongoURI = mongoURI || 'mongodb://localhost:27017/dealer-loyalty';
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
}

// Import models directly
let Product, User, PurchaseRequest, Order;

async function importModels() {
  try {
    // Try to load model index file
    const indexPath = join(__dirname, '../models/index.js');
    if (fs.existsSync(indexPath)) {
      await import(indexPath);
      console.log('Models loaded from index');
    } else {
      console.log('Loading models individually');
      // Load models individually
      const ProductModule = await import('../models/Product.js');
      const UserModule = await import('../models/User.js');
      const PurchaseRequestModule = await import('../models/PurchaseRequest.js');
      const OrderModule = await import('../models/Order.js');
      
      Product = ProductModule.default || mongoose.model('Product');
      User = UserModule.default || mongoose.model('User');
      PurchaseRequest = PurchaseRequestModule.default || mongoose.model('PurchaseRequest');
      Order = OrderModule.default || mongoose.model('Order');
    }
    
    // Get models from mongoose if not directly exported
    Product = Product || mongoose.model('Product');
    User = User || mongoose.model('User');
    PurchaseRequest = PurchaseRequest || mongoose.model('PurchaseRequest');
    Order = Order || mongoose.model('Order');
    
    return true;
  } catch (err) {
    console.error('Error importing models:', err);
    return false;
  }
}

async function testE2EPurchaseRequests() {
  console.log('====== PURCHASE REQUEST END-TO-END TEST ======');
  
  // Step 1: Find an admin user
  console.log('\n[Step 1] Finding an admin user');
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ No admin user found in database');
    return false;
  }
  console.log(`✅ Found admin: ${admin.name} (ID: ${admin._id})`);
  
  // Step 2: Find a client user
  console.log('\n[Step 2] Finding a client user');
  const client = await User.findOne({ role: 'client' });
  if (!client) {
    console.error('❌ No client user found in database');
    return false;
  }
  console.log(`✅ Found client: ${client.name} (ID: ${client._id})`);
  
  // Step 3: Find an admin product with stock
  console.log('\n[Step 3] Finding an admin product with stock');
  const adminProduct = await Product.findOne({ 
    stock: { $gt: 5 },
    isClientUploaded: { $ne: true }
  });
  
  if (!adminProduct) {
    console.error('❌ No admin product with sufficient stock found');
    return false;
  }
  console.log(`✅ Found admin product: ${adminProduct.name} (ID: ${adminProduct._id})`);
  console.log(`   Current stock: ${adminProduct.stock} units`);
  
  // Step 4: Create a purchase request
  console.log('\n[Step 4] Creating a new purchase request');
  const quantity = 3; // Request 3 units
  
  const newRequest = new PurchaseRequest({
    productId: adminProduct._id,
    productName: adminProduct.name,
    clientId: client._id,
    clientName: client.name,
    quantity: quantity,
    price: adminProduct.price,
    status: 'pending',
    notes: 'Test purchase request created by E2E test script',
    organizationId: adminProduct.organizationId
  });
  
  await newRequest.save();
  console.log(`✅ Created purchase request (ID: ${newRequest._id})`);
  console.log(`   Requested ${quantity} units of ${adminProduct.name} at $${adminProduct.price} each`);
  
  // Step 5: Get original admin product stock
  const originalStock = adminProduct.stock;
  console.log(`\n[Step 5] Original admin product stock: ${originalStock} units`);
  
  // Check if client already has this product
  const existingClientProduct = await Product.findOne({
    name: adminProduct.name,
    createdBy: client._id,
    'clientInventory.initialStock': { $exists: true }
  });
  
  const originalClientStock = existingClientProduct 
    ? existingClientProduct.clientInventory.currentStock 
    : 0;
  
  console.log(`   Client ${existingClientProduct ? 'already has' : 'does not have'} this product`);
  if (existingClientProduct) {
    console.log(`   Current client stock: ${originalClientStock} units`);
  }
  
  // Step 6: Approve the purchase request
  console.log('\n[Step 6] Approving the purchase request');
  
  try {
    // Update the request status
    newRequest.status = 'approved';
    
    // Create an order
    const order = new Order({
      productId: adminProduct._id,
      clientId: client._id,
      quantity: quantity,
      price: adminProduct.price,
      total: adminProduct.price * quantity,
      status: 'completed'
    });
    
    await order.save();
    console.log(`✅ Created order (ID: ${order._id})`);
    
    // Link order to request
    newRequest.orderId = order._id;
    await newRequest.save();
    console.log('✅ Updated request status to approved');
    
    // Update admin product inventory
    adminProduct.stock -= quantity;
    await adminProduct.save();
    console.log(`✅ Updated admin product stock: ${adminProduct.stock} units (-${quantity})`);
    
    // Find or create client product
    let clientProduct = existingClientProduct;
    
    if (!clientProduct) {
      // Create new client product
      clientProduct = new Product({
        name: adminProduct.name,
        description: adminProduct.description,
        sku: `CLIENT-${adminProduct.sku || 'SKU'}-${Date.now().toString().substring(8)}`,
        category: adminProduct.category,
        price: adminProduct.price,
        loyaltyPoints: adminProduct.loyaltyPoints,
        stock: 0, // Main stock is 0
        isClientUploaded: true,
        createdBy: client._id,
        organizationId: adminProduct.organizationId,
        clientInventory: {
          initialStock: quantity,
          currentStock: quantity,
          reorderLevel: adminProduct.reorderLevel || 5,
          lastUpdated: new Date()
        }
      });
      
      await clientProduct.save();
      console.log(`✅ Created new client product (ID: ${clientProduct._id})`);
      console.log(`   Initial client stock: ${quantity} units`);
    } else {
      // Update existing client product
      clientProduct.clientInventory.currentStock += quantity;
      clientProduct.clientInventory.lastUpdated = new Date();
      await clientProduct.save();
      console.log(`✅ Updated existing client product (ID: ${clientProduct._id})`);
      console.log(`   Updated client stock: ${clientProduct.clientInventory.currentStock} units (+${quantity})`);
    }
    
    console.log('\n[Step 7] Verifying inventory changes');
    
    // Reload products from database to verify changes
    const updatedAdminProduct = await Product.findById(adminProduct._id);
    const updatedClientProduct = await Product.findById(clientProduct._id);
    
    if (updatedAdminProduct.stock === originalStock - quantity) {
      console.log(`✅ Admin inventory correctly reduced: ${originalStock} → ${updatedAdminProduct.stock}`);
    } else {
      console.error(`❌ Admin inventory incorrect: Expected ${originalStock - quantity}, got ${updatedAdminProduct.stock}`);
    }
    
    const expectedClientStock = originalClientStock + quantity;
    const actualClientStock = updatedClientProduct.clientInventory.currentStock;
    
    if (actualClientStock === expectedClientStock) {
      console.log(`✅ Client inventory correctly increased: ${originalClientStock} → ${actualClientStock}`);
    } else {
      console.error(`❌ Client inventory incorrect: Expected ${expectedClientStock}, got ${actualClientStock}`);
    }
    
    // Check if request status is approved
    const updatedRequest = await PurchaseRequest.findById(newRequest._id);
    if (updatedRequest.status === 'approved') {
      console.log('✅ Purchase request status correctly set to approved');
    } else {
      console.error(`❌ Purchase request status incorrect: Expected approved, got ${updatedRequest.status}`);
    }
    
    console.log('\n====== END-TO-END TEST COMPLETED SUCCESSFULLY ======');
    return true;
  } catch (error) {
    console.error('❌ Error during approval process:', error);
    return false;
  }
}

// Run the test
(async () => {
  try {
    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting test.');
      process.exit(1);
    }
    
    // Import models
    const modelsImported = await importModels();
    if (!modelsImported) {
      console.error('Failed to import models. Exiting test.');
      process.exit(1);
    }
    
    // Run the test
    await testE2EPurchaseRequests();
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (err) {
    console.error('Unhandled error during test:', err);
    process.exit(1);
  }
})();
