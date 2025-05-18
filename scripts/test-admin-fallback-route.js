/**
 * Test the fallback route for admin purchase requests
 */
import axios from 'axios';
import mongoose from 'mongoose';
import User from '../models/User.js';
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

// Test the fallback endpoint
async function testFallbackEndpoint() {
  try {
    console.log('\n===== TESTING ADMIN PURCHASE REQUESTS FALLBACK ENDPOINT =====\n');
    
    // 1. Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found');
      return;
    }
    
    console.log(`Using admin user: ${admin.name} (${admin._id})`);
    console.log(`Organization ID: ${admin.organizationId || 'None'}`);
    
    // 2. Generate a JWT token for authentication
    const token = jwt.sign(
      { 
        id: admin._id,
        role: admin.role,
        organizationId: admin.organizationId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // 3. Set up axios with auth headers
    const api = axios.create({
      baseURL: 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // 4. Test the fallback endpoint
    console.log('\nCalling fallback endpoint...');
    try {
      const response = await api.get('/client-requests/admin-purchase-requests-fallback');
      
      console.log('✅ Fallback route responded successfully');
      console.log(`Found ${response.data.requests?.length || 0} purchase requests`);
      console.log('Response source:', response.data.source || 'not specified');
      
      if (response.data.filter) {
        console.log('Filter used:', response.data.filter);
      }
      
      // Show the first few results
      if (response.data.requests && response.data.requests.length > 0) {
        console.log('\nFirst purchase request:');
        const firstRequest = response.data.requests[0];
        console.log(`- ID: ${firstRequest._id}`);
        console.log(`- Product: ${firstRequest.productName}`);
        console.log(`- Client: ${firstRequest.clientName}`);
        console.log(`- Status: ${firstRequest.status}`);
        console.log(`- Quantity: ${firstRequest.quantity}`);
        console.log(`- Date: ${new Date(firstRequest.createdAt).toLocaleString()}`);
      }
    } catch (error) {
      console.error('❌ Fallback endpoint test failed:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\n===== TEST COMPLETE =====');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the test
testFallbackEndpoint(); 