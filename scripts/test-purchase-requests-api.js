/**
 * Test script for purchase requests API
 * This script tests the robustness of the purchase requests endpoint
 */

import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Test various scenarios for the purchase requests API
async function testPurchaseRequestsAPI() {
  try {
    console.log('\n====== PURCHASE REQUESTS API TEST ======\n');
    
    // Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found');
      return;
    }
    console.log(`Using admin user: ${admin.name} (${admin._id})`);
    console.log(`Organization ID: ${admin.organizationId || 'None'}`);
    
    // Generate a token for API calls
    const token = jwt.sign(
      { 
        id: admin._id,
        role: admin.role,
        organizationId: admin.organizationId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // Setup axios instance with authentication
    const api = axios.create({
      baseURL: 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n----- Test 1: Basic Request -----');
    try {
      const response = await api.get('/products/purchase-requests');
      console.log(`✅ Success - Found ${response.data.length} purchase requests`);
    } catch (error) {
      console.error('❌ Failed - Basic request failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n----- Test 2: With Status Filter -----');
    try {
      const response = await api.get('/products/purchase-requests', {
        params: { status: 'pending' }
      });
      console.log(`✅ Success - Found ${response.data.length} pending purchase requests`);
    } catch (error) {
      console.error('❌ Failed - Status filter request failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n----- Test 3: With Organization ID Filter -----');
    try {
      const response = await api.get('/products/purchase-requests', {
        params: { organizationId: admin.organizationId }
      });
      console.log(`✅ Success - Found ${response.data.length} purchase requests for organization`);
    } catch (error) {
      console.error('❌ Failed - Organization filter request failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n----- Test 4: With Invalid Organization ID -----');
    try {
      const response = await api.get('/products/purchase-requests', {
        params: { organizationId: 'invalid-id' }
      });
      console.log(`✅ Success - Server handled invalid ID gracefully`);
      console.log(`Found ${response.data.length} purchase requests using fallback filter`);
    } catch (error) {
      console.error('❌ Failed - Invalid organization ID request failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n----- Test 5: With Combined Filters -----');
    try {
      const response = await api.get('/products/purchase-requests', {
        params: { 
          organizationId: admin.organizationId,
          status: 'pending'
        }
      });
      console.log(`✅ Success - Found ${response.data.length} pending purchase requests for organization`);
    } catch (error) {
      console.error('❌ Failed - Combined filters request failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n====== TEST COMPLETE ======');
  } catch (error) {
    console.error('Test script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the test
testPurchaseRequestsAPI(); 