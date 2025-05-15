import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function fixProducts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Define the Product Schema
    const productSchema = new mongoose.Schema({
      name: String,
      description: String,
      sku: String,
      category: String,
      price: Number,
      loyaltyPoints: Number,
      stock: Number,
      reorderLevel: Number,
      reservedStock: Number,
      minOrderQuantity: Number,
      maxOrderQuantity: Number,
      images: [String],
      specifications: [{
        name: String,
        value: String
      }],
      deals: [{
        name: String,
        description: String,
        quantity: Number,
        discountPercentage: Number,
        bonusLoyaltyPoints: Number,
        startDate: Date,
        endDate: Date,
        isActive: Boolean
      }],
      status: String,
      organizationId: mongoose.Schema.Types.ObjectId,
      createdBy: mongoose.Schema.Types.ObjectId,
      isClientUploaded: Boolean,
      clientInventory: {
        initialStock: Number,
        currentStock: Number,
        reorderLevel: Number,
        lastUpdated: Date
      }
    }, { timestamps: true });

    // Register model
    let Product;
    try {
      Product = mongoose.model('Product');
    } catch (e) {
      Product = mongoose.model('Product', productSchema);
    }

    // Get all products
    console.log('\nFetching products from the database...');
    const products = await Product.find();
    
    console.log(`\nFound ${products.length} products in the database.`);
    console.log('Checking and fixing missing fields...');
    
    let updatedCount = 0;
    
    // Update each product if needed
    for (const product of products) {
      let needsUpdate = false;
      
      // Check and fix missing stock field
      if (product.stock === undefined) {
        // Convert from old structure if possible
        product.stock = product.inventory?.currentStock || 0;
        needsUpdate = true;
        console.log(`Adding missing stock field to product ${product.name}`);
      }
      
      // Check and fix missing reorderLevel
      if (product.reorderLevel === undefined) {
        // Convert from old structure or set default
        product.reorderLevel = product.inventory?.reorderLevel || product.minOrderQuantity || 5;
        needsUpdate = true;
        console.log(`Adding missing reorderLevel field to product ${product.name}`);
      }
      
      // Check and fix missing category
      if (!product.category) {
        // Set default category if missing
        product.category = product.categories?.[0] || 'General';
        needsUpdate = true;
        console.log(`Adding missing category field to product ${product.name}`);
      }
      
      // Check and fix price field
      if (product.price === undefined) {
        // Convert from old structure if possible
        product.price = product.pricing?.manufacturerPrice || 0;
        needsUpdate = true;
        console.log(`Adding missing price field to product ${product.name}`);
      }
      
      // Check and fix loyaltyPoints field
      if (product.loyaltyPoints === undefined) {
        product.loyaltyPoints = 0;
        needsUpdate = true;
        console.log(`Adding missing loyaltyPoints field to product ${product.name}`);
      }
      
      // Check and fix reservedStock field
      if (product.reservedStock === undefined) {
        product.reservedStock = product.inventory?.reservedStock || 0;
        needsUpdate = true;
        console.log(`Adding missing reservedStock field to product ${product.name}`);
      }
      
      // Save product if updates were made
      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`Updated product: ${product.name}`);
      }
    }
    
    console.log(`\nUpdated ${updatedCount} products with missing fields.`);
    console.log(`${products.length - updatedCount} products were already correctly configured.`);

  } catch (error) {
    console.error('\nError fixing products:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
fixProducts(); 