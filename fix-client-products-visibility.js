import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import './models/Product.js';
import './models/User.js';

const Product = mongoose.model('Product');
const User = mongoose.model('User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolt-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  fixClientProductsVisibility();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Fix client products visibility by ensuring:
 * 1. All client products have isClientUploaded=true
 * 2. Stock field matches clientInventory.currentStock
 * 3. Products with CLIENT- SKU prefix have proper flags set
 */
async function fixClientProductsVisibility() {
  try {
    console.log('\n====== FIXING CLIENT PRODUCTS VISIBILITY ======\n');

    // 1. Get all client users
    const clientUsers = await User.find({
      role: { $in: ['client', 'client_admin'] }
    });
    
    console.log(`Found ${clientUsers.length} client users`);
    
    let totalFixed = 0;
    let totalChecked = 0;

    // 2. For each client, find and fix their products
    for (const client of clientUsers) {
      console.log(`\nProcessing client: ${client.name} (${client._id})`);
      
      // Find all products created by this client
      const clientProducts = await Product.find({
        createdBy: client._id
      });
      
      console.log(`Found ${clientProducts.length} products for client ${client._id}`);
      
      // Fix each product
      for (const product of clientProducts) {
        totalChecked++;
        let needsUpdate = false;
        
        console.log(`\nChecking product: ${product.name} (${product._id})`);
        
        // Check if product needs isClientUploaded flag
        if (!product.isClientUploaded) {
          console.log(`Setting isClientUploaded=true for product ${product._id}`);
          product.isClientUploaded = true;
          needsUpdate = true;
        }
        
        // Check if stock field needs to be updated from clientInventory
        if (product.clientInventory && product.clientInventory.currentStock !== undefined) {
          if (product.stock !== product.clientInventory.currentStock) {
            console.log(`Updating stock from ${product.stock} to ${product.clientInventory.currentStock}`);
            product.stock = product.clientInventory.currentStock;
            needsUpdate = true;
          }
        }
        
        // Check if product has CLIENT- prefix in SKU but missing isClientUploaded flag
        if (product.sku && product.sku.startsWith('CLIENT-') && !product.isClientUploaded) {
          console.log(`Product ${product._id} has CLIENT- SKU prefix but missing isClientUploaded flag`);
          product.isClientUploaded = true;
          needsUpdate = true;
        }
        
        // Save if needed
        if (needsUpdate) {
          await product.save();
          console.log(`✅ Updated product ${product._id}`);
          totalFixed++;
        } else {
          console.log(`✓ Product ${product._id} is correctly configured`);
        }
      }
    }

    // 3. Find any products with CLIENT- prefix that were missed
    const clientPrefixProducts = await Product.find({
      sku: { $regex: '^CLIENT-' },
      isClientUploaded: { $ne: true }
    });
    
    console.log(`\nFound ${clientPrefixProducts.length} additional products with CLIENT- prefix missing isClientUploaded flag`);
    
    for (const product of clientPrefixProducts) {
      totalChecked++;
      console.log(`Fixing product ${product._id} (${product.name})`);
      product.isClientUploaded = true;
      await product.save();
      totalFixed++;
    }

    console.log('\n====== FIX COMPLETE ======');
    console.log(`
Summary:
- Total products checked: ${totalChecked}
- Total products fixed: ${totalFixed}
    `);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing client products visibility:', error);
    process.exit(1);
  }
} 