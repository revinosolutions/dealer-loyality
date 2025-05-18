// Script to directly check client inventory items in MongoDB
// This bypasses the API and UI to see what's actually in the database

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Client ID to check
const CLIENT_ID = '6829b20dd20296da9beea0b4';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log('MongoDB connected successfully');
    checkClientInventory();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function checkClientInventory() {
  try {
    // Get direct access to the collections
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    const usersCollection = db.collection('users');
    const purchaseRequestsCollection = db.collection('purchaserequests');
    
    // Get the client ID as ObjectId
    const clientObjectId = new mongoose.Types.ObjectId(CLIENT_ID);
    
    console.log('\n======= CLIENT INFO =======');
    // Check client user information
    const clientUser = await usersCollection.findOne({ _id: clientObjectId });
    if (clientUser) {
      console.log('Client User Found:');
      console.log(`Name: ${clientUser.name}`);
      console.log(`Email: ${clientUser.email}`);
      console.log(`Role: ${clientUser.role}`);
      console.log(`Organization ID: ${clientUser.organizationId}`);
    } else {
      console.log('Client user not found!');
    }
    
    console.log('\n======= CLIENT PRODUCTS =======');
    // Method 1: Query by createdBy field
    const clientProducts = await productsCollection.find({ 
      createdBy: clientObjectId 
    }).toArray();
    
    console.log(`Found ${clientProducts.length} products with createdBy: ${CLIENT_ID}`);
    
    // Method 2: Query by string createdBy
    const clientProductsStr = await productsCollection.find({ 
      createdBy: CLIENT_ID 
    }).toArray();
    
    console.log(`Found ${clientProductsStr.length} products with createdBy as string: ${CLIENT_ID}`);
    
    // Method 3: Query for client inventory field
    const clientInventoryProducts = await productsCollection.find({ 
      'clientInventory.initialStock': { $exists: true },
      createdBy: clientObjectId
    }).toArray();
    
    console.log(`Found ${clientInventoryProducts.length} products with clientInventory field`);
    
    // Method 4: Any product marked as client uploaded
    const clientUploadedProducts = await productsCollection.find({ 
      isClientUploaded: true,
      createdBy: clientObjectId
    }).toArray();
    
    console.log(`Found ${clientUploadedProducts.length} products marked as isClientUploaded: true`);
    
    // Display details for all found products
    console.log('\n======= PRODUCT DETAILS =======');
    const allClientProducts = [...new Set([...clientProducts, ...clientProductsStr, ...clientInventoryProducts, ...clientUploadedProducts])];
    
    if (allClientProducts.length > 0) {
      allClientProducts.forEach((product, index) => {
        console.log(`\n--- Product ${index + 1} ---`);
        console.log(`ID: ${product._id}`);
        console.log(`Name: ${product.name}`);
        console.log(`SKU: ${product.sku}`);
        console.log(`Stock: ${product.stock}`);
        console.log(`isClientUploaded: ${product.isClientUploaded}`);
        console.log(`createdBy: ${product.createdBy}`);
        console.log(`createdBy type: ${typeof product.createdBy}`);
        console.log(`Has clientInventory: ${!!product.clientInventory}`);
        
        if (product.clientInventory) {
          console.log(`  - initialStock: ${product.clientInventory.initialStock}`);
          console.log(`  - currentStock: ${product.clientInventory.currentStock}`);
          console.log(`  - reorderLevel: ${product.clientInventory.reorderLevel}`);
          console.log(`  - lastUpdated: ${product.clientInventory.lastUpdated}`);
        }
      });
    } else {
      console.log('No client products found at all!');
    }
    
    console.log('\n======= PURCHASE REQUESTS =======');
    // Check purchase requests
    const purchaseRequests = await purchaseRequestsCollection.find({
      clientId: clientObjectId
    }).toArray();
    
    console.log(`Found ${purchaseRequests.length} purchase requests for client`);
    
    // Group by status
    const pendingRequests = purchaseRequests.filter(pr => pr.status === 'pending');
    const approvedRequests = purchaseRequests.filter(pr => pr.status === 'approved');
    const rejectedRequests = purchaseRequests.filter(pr => pr.status === 'rejected');
    
    console.log(`Pending: ${pendingRequests.length}`);
    console.log(`Approved: ${approvedRequests.length}`);
    console.log(`Rejected: ${rejectedRequests.length}`);
    
    // Look at approved requests
    if (approvedRequests.length > 0) {
      console.log('\n======= APPROVED REQUESTS =======');
      approvedRequests.forEach((request, index) => {
        console.log(`\n--- Approved Request ${index + 1} ---`);
        console.log(`ID: ${request._id}`);
        console.log(`Product ID: ${request.productId}`);
        console.log(`Product Name: ${request.productName}`);
        console.log(`Quantity: ${request.quantity}`);
        console.log(`Price: ${request.price}`);
        console.log(`Created At: ${request.createdAt}`);
        
        // Find the corresponding product
        const relatedProduct = allClientProducts.find(p => 
          p.name === request.productName
        );
        
        if (relatedProduct) {
          console.log(`Found corresponding product in client inventory with ID: ${relatedProduct._id}`);
        } else {
          console.log('NO CORRESPONDING PRODUCT FOUND in client inventory!');
        }
      });
    }
    
    // Close MongoDB connection after 1 second to ensure all logs are printed
    setTimeout(() => {
      mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }, 1000);
  } catch (error) {
    console.error('Error checking client inventory:', error);
    mongoose.connection.close();
    process.exit(1);
  }
} 