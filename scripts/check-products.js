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

async function checkProducts() {
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
    const products = await Product.find().lean();
    
    console.log(`\nFound ${products.length} products in the database:`);
    
    if (products.length === 0) {
      console.log('No products found in the database.');
    } else {
      // Display each product with key fields
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. Product: ${product.name}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Category: ${product.category || 'Not set'}`);
        console.log(`   Price: ${product.price || 0}`);
        console.log(`   Stock: ${product.stock || 0}`);
        console.log(`   ReorderLevel: ${product.reorderLevel || 'Not set'}`);
        console.log(`   Status: ${product.status || 'Not set'}`);
        console.log(`   Created by: ${product.createdBy || 'Unknown'}`);
        console.log(`   Created at: ${product.createdAt || 'Unknown'}`);
      });
    }

  } catch (error) {
    console.error('\nError checking products:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
checkProducts(); 