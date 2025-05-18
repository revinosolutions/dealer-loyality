/**
 * Test script for AdminPurchaseRequestsPage
 * This script tests the admin's ability to view and process purchase requests
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Test admin purchase requests functionality
 */
async function testAdminPurchaseRequests() {
  try {
    console.log('\n====== ADMIN PURCHASE REQUESTS TEST ======\n');
    
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
    
    // 3. Find or create a test product
    let testProduct = await Product.findOne({ 
      createdBy: admin._id,
      stock: { $gt: 5 }
    });
    
    if (!testProduct) {
      console.log('Creating a test product for admin');
      testProduct = new Product({
        name: 'Test Product ' + Date.now(),
        description: 'A test product for purchase requests',
        sku: 'TEST-PR-' + Date.now(),
        category: 'Test',
        price: 100,
        loyaltyPoints: 10,
        stock: 50,
        createdBy: admin._id,
        organizationId: admin.organizationId
      });
      await testProduct.save();
    }
    
    console.log(`Using test product: ${testProduct.name} (${testProduct._id}), Stock: ${testProduct.stock}`);
    
    // 4. Create a test purchase request
    const existingRequest = await PurchaseRequest.findOne({
      productId: testProduct._id,
      clientId: client._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      console.log(`Using existing purchase request: ${existingRequest._id}`);
    } else {
      const newPurchaseRequest = new PurchaseRequest({
        productId: testProduct._id,
        productName: testProduct.name,
        clientId: client._id,
        clientName: client.name,
        quantity: 2,
        price: testProduct.price,
        status: 'pending',
        organizationId: admin.organizationId
      });
      
      await newPurchaseRequest.save();
      console.log(`Created new test purchase request: ${newPurchaseRequest._id}`);
    }
    
    // 5. Generate a test admin token (for API testing)
    const token = jwt.sign(
      { 
        id: admin._id,
        role: admin.role,
        organizationId: admin.organizationId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    console.log('\n==== AUTHENTICATION TEST INFO ====');
    console.log('Token for testing (valid for 1 hour):');
    console.log(token);
    console.log('\nTo test the API directly:');
    console.log('curl -H "Authorization: Bearer ' + token + '" http://localhost:3000/api/products/purchase-requests');
    
    // 6. Count pending purchase requests for this admin
    const pendingRequestsCount = await PurchaseRequest.countDocuments({
      organizationId: admin.organizationId,
      status: 'pending'
    });
    
    console.log(`\nPending purchase requests for admin: ${pendingRequestsCount}`);
    console.log('\n====== TEST COMPLETE ======');
    
  } catch (error) {
    console.error('Error testing admin purchase requests:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the test
testAdminPurchaseRequests(); 