import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define Product model with a flexible schema to handle all properties
const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', ProductSchema);

async function fixProductFlags() {
  try {
    console.log('Starting product flag fix...');

    // Find the product from our database check
    const productId = '6826c9e0bf9538b23bdc3494'; // BMW -3 SERIES LIMOUSINE
    
    // Get the product
    const product = await Product.findById(productId);
    
    if (!product) {
      console.log(`Product with ID ${productId} not found!`);
      process.exit(1);
    }
    
    console.log(`Found product: ${product.name}`);
    console.log(`Current flags: isClientUploaded=${product.isClientUploaded}, status=${product.status}`);
    
    // Create a duplicate admin product
    const adminProductData = {
      name: product.name,
      description: product.description,
      sku: `${product.sku}-ADMIN`,
      category: product.category,
      price: product.price,
      loyaltyPoints: product.loyaltyPoints,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      reservedStock: product.reservedStock,
      images: product.images,
      specifications: product.specifications,
      status: 'active',
      organizationId: product.organizationId,
      createdBy: product.createdBy,
      isClientUploaded: false // Mark as admin product
    };
    
    const newAdminProduct = new Product(adminProductData);
    await newAdminProduct.save();
    
    console.log(`Created new admin product: ${newAdminProduct.name} (${newAdminProduct._id})`);
    console.log('Flags: isClientUploaded=false, status=active');
    
    console.log('\nFinished fixing product flags!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing product flags:', error);
    process.exit(1);
  }
}

// Run the function
fixProductFlags(); 