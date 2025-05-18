import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import './models/Product.js';
import './models/User.js';

const Product = mongoose.model('Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolt-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  fixMisclassifiedProducts();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Fix products that are misclassified (admin products with client inventory fields)
 */
async function fixMisclassifiedProducts() {
  try {
    console.log('\n====== FIXING MISCLASSIFIED PRODUCTS ======\n');

    // Find admin products with client inventory fields
    const misclassifiedProducts = await Product.find({
      isClientUploaded: false,
      'clientInventory.currentStock': { $exists: true }
    });
    
    console.log(`Found ${misclassifiedProducts.length} misclassified admin products with client inventory fields`);

    for (const product of misclassifiedProducts) {
      console.log(`\nProcessing product: ${product.name} (${product._id})`);
      console.log(`Current state: isClientUploaded=${product.isClientUploaded}, clientInventory=${JSON.stringify(product.clientInventory)}`);
      
      // Determine if this should be a client product
      const hasActiveClientInventory = product.clientInventory && product.clientInventory.currentStock > 0;
      const hasClientSku = product.sku && product.sku.startsWith('CLIENT-');
      
      if (hasActiveClientInventory || hasClientSku) {
        // This should be a client product
        console.log(`Product ${product._id} should be a client product, setting isClientUploaded=true`);
        product.isClientUploaded = true;
        
        // Also update stock field if needed
        if (product.clientInventory && product.clientInventory.currentStock !== undefined && 
            product.stock !== product.clientInventory.currentStock) {
          console.log(`Updating stock from ${product.stock} to ${product.clientInventory.currentStock}`);
          product.stock = product.clientInventory.currentStock;
        }
      } else {
        // This is an admin product with empty client inventory, remove the clientInventory field
        console.log(`Product ${product._id} is an admin product with empty client inventory, removing clientInventory`);
        product.clientInventory = undefined;
      }
      
      await product.save();
      console.log(`✅ Updated product ${product._id}`);
    }
    
    // Find admin products with CLIENT- SKU prefix
    const misclassifiedSkuProducts = await Product.find({
      isClientUploaded: false,
      sku: { $regex: '^CLIENT-' }
    });
    
    console.log(`\nFound ${misclassifiedSkuProducts.length} admin products with CLIENT- SKU prefix`);
    
    for (const product of misclassifiedSkuProducts) {
      console.log(`\nUpdating product: ${product.name} (${product._id})`);
      product.isClientUploaded = true;
      await product.save();
      console.log(`✅ Updated product ${product._id}`);
    }

    console.log('\n====== FIX COMPLETE ======\n');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing misclassified products:', error);
    process.exit(1);
  }
} 