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
  diagnoseClientInventory();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Diagnose client inventory issues
 */
async function diagnoseClientInventory() {
  try {
    console.log('\n====== DIAGNOSING CLIENT INVENTORY ISSUES ======\n');

    // Find a client user
    const client = await User.findOne({ role: 'client' });
    if (!client) {
      console.error('No client user found for diagnosis');
      process.exit(1);
    }
    console.log(`Using client user: ${client.name} (${client._id})`);

    // 1. Find products specifically created for this client (with isClientUploaded flag)
    const clientProducts = await Product.find({
      createdBy: client._id,
      isClientUploaded: true
    });
    console.log(`\n1. Found ${clientProducts.length} products with isClientUploaded=true for client ${client._id}`);
    
    if (clientProducts.length > 0) {
      console.log('\nSample client product:');
      console.log(JSON.stringify(clientProducts[0], null, 2));
    }

    // 2. Find all client products created from approved requests
    const approvedRequests = await PurchaseRequest.find({
      clientId: client._id,
      status: 'approved'
    }).populate('productId');
    
    console.log(`\n2. Found ${approvedRequests.length} approved purchase requests for client ${client._id}`);
    
    if (approvedRequests.length > 0) {
      const request = approvedRequests[0];
      console.log('\nSample approved request:');
      console.log({
        id: request._id,
        productName: request.productName,
        quantity: request.quantity,
        status: request.status
      });
    }

    // 3. Check for client products with BMW in the name
    const bmwProducts = await Product.find({
      name: { $regex: 'BMW', $options: 'i' },
      isClientUploaded: true
    });
    
    console.log(`\n3. Found ${bmwProducts.length} BMW products with isClientUploaded=true`);
    
    if (bmwProducts.length > 0) {
      console.log('\nBMW products:');
      for (const product of bmwProducts) {
        console.log({
          id: product._id,
          name: product.name,
          stock: product.stock,
          clientInventory: product.clientInventory,
          createdBy: product.createdBy,
          isClientUploaded: product.isClientUploaded,
          sku: product.sku
        });
      }
    }

    // 4. Check what products are being returned by the client inventory API query
    console.log('\n4. Simulating client inventory API query');
    const apiQueryProducts = await Product.find({
      createdBy: client._id,
      isClientUploaded: true
    }).sort({ 'clientInventory.lastUpdated': -1 });
    
    console.log(`API query returned ${apiQueryProducts.length} products`);
    
    if (apiQueryProducts.length > 0) {
      console.log('\nProducts returned by API query:');
      for (const product of apiQueryProducts) {
        console.log({
          id: product._id,
          name: product.name,
          stock: product.stock,
          clientStock: product.clientInventory?.currentStock,
          isClientUploaded: product.isClientUploaded
        });
      }
    } else {
      console.log('⚠️ API query returned no products - this explains the blank client inventory page');
    }

    // 5. Check for any products that might be associated with client but missing isClientUploaded flag
    console.log('\n5. Checking for products associated with client but missing isClientUploaded flag');
    const possiblyClientProducts = await Product.find({
      createdBy: client._id,
      isClientUploaded: { $ne: true }
    });
    
    console.log(`Found ${possiblyClientProducts.length} products with createdBy=${client._id} but isClientUploaded!=true`);
    
    if (possiblyClientProducts.length > 0) {
      console.log('\nPossible client products missing isClientUploaded flag:');
      for (const product of possiblyClientProducts) {
        console.log({
          id: product._id,
          name: product.name,
          stock: product.stock,
          clientInventory: product.clientInventory ? true : false,
          sku: product.sku
        });
      }
    }

    // 6. Check specific BMW product
    console.log('\n6. Looking for specific BMW 3 Series product');
    const bmw3Series = await Product.find({
      name: 'BMW -3 SERIES LIMOUSINE'
    });
    
    console.log(`Found ${bmw3Series.length} BMW 3 Series products`);
    
    if (bmw3Series.length > 0) {
      console.log('\nBMW 3 Series products:');
      for (const product of bmw3Series) {
        console.log({
          id: product._id,
          name: product.name,
          stock: product.stock,
          clientInventory: product.clientInventory,
          createdBy: product.createdBy,
          isClientUploaded: product.isClientUploaded,
          sku: product.sku
        });
      }
    }

    console.log('\n====== DIAGNOSIS COMPLETE ======\n');
    process.exit(0);
  } catch (error) {
    console.error('Error diagnosing client inventory:', error);
    process.exit(1);
  }
} 