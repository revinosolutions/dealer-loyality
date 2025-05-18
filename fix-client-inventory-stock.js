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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bolt-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  fixClientInventoryStock();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

/**
 * Fix client inventory stock by syncing the stock field with clientInventory.currentStock
 */
async function fixClientInventoryStock() {
  try {
    console.log('\n====== FIXING CLIENT INVENTORY STOCK ======\n');

    // Find all client products with clientInventory
    const clientProducts = await Product.find({
      isClientUploaded: true,
      'clientInventory.currentStock': { $exists: true }
    });

    console.log(`Found ${clientProducts.length} client products to fix`);

    let updated = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const product of clientProducts) {
      const clientStock = product.clientInventory?.currentStock || 0;
      const currentStock = product.stock || 0;

      console.log(`\nChecking product: ${product.name} (${product._id})`);
      console.log(`Current values - stock: ${currentStock}, clientInventory.currentStock: ${clientStock}`);

      if (currentStock !== clientStock) {
        try {
          // Update the stock field to match clientInventory.currentStock
          console.log(`Updating stock from ${currentStock} to ${clientStock}`);
          product.stock = clientStock;
          await product.save();
          console.log('✅ Updated successfully');
          updated++;
        } catch (error) {
          console.error(`❌ Error updating product ${product._id}:`, error.message);
          errors++;
        }
      } else {
        console.log('✓ Stock values already match, no update needed');
        alreadyCorrect++;
      }
    }

    console.log('\n====== FIX COMPLETE ======');
    console.log(`
Summary:
- Total client products: ${clientProducts.length}
- Updated: ${updated}
- Already correct: ${alreadyCorrect}
- Errors: ${errors}
    `);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing client inventory stock:', error);
    process.exit(1);
  }
} 