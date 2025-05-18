// Script to test the purchase request approval process
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import User from '../models/User.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Order from '../models/Order.js';

// Load environment variables
dotenv.config();

// Import database configuration from server
import { connectDB } from '../server/db.js';

// Connect to MongoDB using the server's configuration
connectDB()
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

async function testPurchaseRequestApproval() {
  try {
    console.log('Starting purchase request approval test...');
    
    // 1. Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found');
      return;
    }
    console.log(`Found admin user: ${admin.name} (${admin._id})`);
    
    // 2. Find a client user
    const client = await User.findOne({ role: 'client' });
    if (!client) {
      console.error('No client user found');
      return;
    }
    console.log(`Found client user: ${client.name} (${client._id})`);
    
    // 3. Find an admin product with stock
    const adminProduct = await Product.findOne({ 
      createdBy: admin._id,
      stock: { $gt: 0 },
      isClientUploaded: { $ne: true }
    });
    if (!adminProduct) {
      console.error('No admin product with stock found');
      return;
    }
    console.log(`Found admin product: ${adminProduct.name} (${adminProduct._id}), Stock: ${adminProduct.stock}`);
    
    // 4. Create a test purchase request
    const requestQuantity = 1; // Request just 1 unit
    const newPurchaseRequest = new PurchaseRequest({
      productId: adminProduct._id,
      productName: adminProduct.name,
      clientId: client._id,
      clientName: client.name,
      quantity: requestQuantity,
      price: adminProduct.price,
      status: 'pending',
      organizationId: admin.organizationId
    });
    
    await newPurchaseRequest.save();
    console.log(`Created purchase request: ${newPurchaseRequest._id}`);
    
    // 5. Approve the purchase request (simulating the API endpoint)
    // Check if there is enough stock
    if (adminProduct.stock < requestQuantity) {
      console.error('Not enough stock available');
      return;
    }
    
    // Find if the client already has this product in their inventory
    let clientProduct = await Product.findOne({
      name: adminProduct.name,
      'clientInventory.initialStock': { $exists: true },
      createdBy: client._id
    });
    
    let isNewProduct = false;
    
    // If client doesn't have this product, create a new client product
    if (!clientProduct) {
      isNewProduct = true;
      clientProduct = new Product({
        name: adminProduct.name,
        description: adminProduct.description,
        sku: `CLIENT-${adminProduct.sku}-${Date.now().toString().substring(8)}`,
        category: adminProduct.category,
        price: adminProduct.price,
        loyaltyPoints: adminProduct.loyaltyPoints,
        stock: 0, // Client products don't use regular stock
        isClientUploaded: true,
        createdBy: client._id,
        organizationId: admin.organizationId,
        clientInventory: {
          initialStock: requestQuantity,
          currentStock: requestQuantity,
          reorderLevel: adminProduct.reorderLevel || 5,
          lastUpdated: new Date()
        }
      });
    } else {
      // Update existing client product inventory
      clientProduct.clientInventory.currentStock += requestQuantity;
      clientProduct.clientInventory.lastUpdated = new Date();
    }
    
    // Save client product
    await clientProduct.save();
    console.log(`${isNewProduct ? 'Created' : 'Updated'} client product: ${clientProduct.name} (${clientProduct._id})`);
    console.log(`Client product inventory: ${clientProduct.clientInventory.currentStock}`);
    
    // Create an order
    const order = new Order({
      productId: adminProduct._id,
      clientId: client._id,
      quantity: requestQuantity,
      price: adminProduct.price,
      total: adminProduct.price * requestQuantity,
      status: 'completed'
    });
    
    await order.save();
    console.log(`Created order: ${order._id}`);
    
    // Update the purchase request
    newPurchaseRequest.status = 'approved';
    newPurchaseRequest.orderId = order._id;
    await newPurchaseRequest.save();
    console.log(`Updated purchase request status to: ${newPurchaseRequest.status}`);
    
    // Update admin product inventory
    const originalStock = adminProduct.stock;
    adminProduct.stock -= requestQuantity;
    await adminProduct.save();
    console.log(`Updated admin product stock from ${originalStock} to ${adminProduct.stock}`);
    
    console.log('Test completed successfully!');
    console.log({
      adminProduct: {
        id: adminProduct._id,
        name: adminProduct.name,
        newStock: adminProduct.stock
      },
      clientProduct: {
        id: clientProduct._id,
        name: clientProduct.name,
        stock: clientProduct.clientInventory.currentStock,
        isNew: isNewProduct,
        isClientUploaded: clientProduct.isClientUploaded
      }
    });
    
  } catch (err) {
    console.error('Error in test:', err);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testPurchaseRequestApproval();
