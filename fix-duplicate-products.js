import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define Product model with a flexible schema to handle all properties
const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', ProductSchema);

async function fixDuplicateProducts() {
  try {
    console.log('Starting duplicate product fix...');

    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} total products`);

    // Find potential duplicates by name
    const productsByName = {};
    products.forEach(product => {
      if (!productsByName[product.name]) {
        productsByName[product.name] = [];
      }
      productsByName[product.name].push(product);
    });

    // Find names with multiple products
    const duplicateNames = Object.keys(productsByName).filter(
      name => productsByName[name].length > 1
    );
    
    console.log(`Found ${duplicateNames.length} products with duplicate names`);

    // Process each set of duplicates
    for (const name of duplicateNames) {
      console.log(`\nProcessing duplicates for product: ${name}`);
      const dupes = productsByName[name];
      
      console.log(`Found ${dupes.length} duplicates with the same name`);
      
      // List all duplicates
      dupes.forEach((product, i) => {
        console.log(`Duplicate #${i+1}: ID=${product._id}, SKU=${product.sku}, isClientUploaded=${product.isClientUploaded}`);
      });
      
      // Sort to find the original product (prefer non-client-uploaded and earlier creation)
      const sortedDupes = [...dupes].sort((a, b) => {
        // Prefer admin-created products (isClientUploaded = false)
        if (a.isClientUploaded !== b.isClientUploaded) {
          return a.isClientUploaded ? 1 : -1;
        }
        
        // If both are the same type, prefer the one created earlier
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      // Keep the best product
      const keeper = sortedDupes[0];
      console.log(`Keeping product: ID=${keeper._id}, SKU=${keeper.sku}, isClientUploaded=${keeper.isClientUploaded}`);
      
      // Delete the others
      for (let i = 1; i < sortedDupes.length; i++) {
        const dupe = sortedDupes[i];
        console.log(`Deleting duplicate: ID=${dupe._id}, SKU=${dupe.sku}`);
        await Product.deleteOne({ _id: dupe._id });
      }
    }

    // Verification check after cleanup
    const remainingProducts = await Product.find({});
    console.log(`\nCleanup complete. ${products.length - remainingProducts.length} duplicates removed.`);
    console.log(`${remainingProducts.length} products remaining in the database.`);
    
    console.log('\nVerifying remaining products...');
    const nameCount = {};
    remainingProducts.forEach(product => {
      nameCount[product.name] = (nameCount[product.name] || 0) + 1;
    });
    
    const remaining = Object.keys(nameCount).filter(name => nameCount[name] > 1);
    if (remaining.length > 0) {
      console.log(`Warning: Still found ${remaining.length} products with duplicate names.`);
      remaining.forEach(name => {
        console.log(`- "${name}" has ${nameCount[name]} occurrences`);
      });
    } else {
      console.log('Success: No duplicate product names found in the database.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing duplicate products:', error);
    process.exit(1);
  }
}

// Run the function
fixDuplicateProducts(); 