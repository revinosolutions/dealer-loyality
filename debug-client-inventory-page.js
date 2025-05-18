import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

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
  debugClientInventoryPage();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Debug client inventory page blank issue
 */
async function debugClientInventoryPage() {
  try {
    console.log('\n====== DEBUGGING CLIENT INVENTORY PAGE BLANK ISSUE ======\n');

    // Find a client user
    const client = await User.findOne({ role: 'client' });
    if (!client) {
      console.error('No client user found for debugging');
      process.exit(1);
    }
    console.log(`Using client user: ${client.name} (${client._id}) with role: ${client.role}`);

    // 1. Check if our routes are properly registered
    console.log(`\n1. Checking server route configuration:`);
    console.log(`- Route /api/client-inventory should be registered in server.js`);
    console.log(`- Route /dashboard/client-inventory should be registered in router.tsx (found)`);
    
    // 2. Check if client inventory endpoint is working on the server
    console.log(`\n2. Checking client products in database:`);
    
    // a. Using the improved query that includes multiple criteria for finding client products
    const clientProductsComprehensive = await Product.find({
      $and: [
        // Must be created by this client
        { createdBy: client._id },
        // And must be either:
        { $or: [
          // Explicitly marked as client uploaded
          { isClientUploaded: true },
          // Or has a CLIENT- SKU prefix 
          { sku: { $regex: '^CLIENT-' } },
          // Or has client inventory data
          { 'clientInventory.currentStock': { $exists: true } }
        ]}
      ]
    });
    
    console.log(`Found ${clientProductsComprehensive.length} client products with comprehensive query`);
    
    if (clientProductsComprehensive.length > 0) {
      console.log(`\nSample client products:`);
      clientProductsComprehensive.forEach(product => {
        console.log(`- ${product.name} (${product.sku}): stock=${product.stock}, isClientUploaded=${product.isClientUploaded}`);
      });
    }
    
    // b. Using only isClientUploaded flag (the old, limited approach)
    const clientProductsSimple = await Product.find({
      createdBy: client._id,
      isClientUploaded: true
    });
    
    console.log(`\nFound ${clientProductsSimple.length} client products with simple query (isClientUploaded=true only)`);
    
    // 3. Check the component props and rendering
    console.log(`\n3. Component initialization and props:`);
    console.log(`- ClientInventoryPage correctly loads ClientInventoryDisplay component`);
    console.log(`- ClientInventoryDisplay fetches data with axios.get('/api/client-inventory')`);
    console.log(`- Component checks user.role === 'client' || user.role === 'client_admin' before fetching`);
    
    // 4. Check for common errors
    console.log(`\n4. Potential issues:`);
    console.log(`a. AuthContext might not be providing correct user role`);
    console.log(`b. API route /api/client-inventory might not be registered`);
    console.log(`c. Axios request might be failing (check browser network tab)`);
    console.log(`d. Server might be returning error for client-inventory endpoint`);
    
    // 5. Check Sidebar navigation
    console.log(`\n5. Sidebar Navigation:`);
    console.log(`- 'Client Inventory' navigation item is present in sidebar for clients`);
    console.log(`- Navigation uses href="/dashboard/client-inventory"`);
    
    // 6. Check for CORS or network issues
    console.log(`\n6. Network/CORS recommendations:`);
    console.log(`- Check browser console for network errors`);
    console.log(`- Ensure that the proxy is set correctly in package.json`);
    console.log(`- Check for any 401/403 errors that might indicate authentication issues`);

    // 7. Fix recommendations
    console.log(`\n7. Recommended fixes if blank page persists:`);
    console.log(`a. Add error debug logging to ClientInventoryDisplay component`);
    console.log(`b. Check if API response is properly structured`);
    console.log(`c. Verify authContext user role is correct at runtime`);
    console.log(`d. Check server logs for any errors handling the client-inventory endpoint`);
    
    console.log(`\n====== DEBUGGING COMPLETE ======\n`);
    
    console.log(`Next steps:`);
    console.log(`1. Add console.log in browser to check AuthContext.user and user.role`);
    console.log(`2. Ensure your dev server is running`);
    console.log(`3. Check browser network tab for API request failures`);
    console.log(`4. Verify server.js has client-inventory route registered`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error debugging client inventory page:', error);
    process.exit(1);
  }
} 