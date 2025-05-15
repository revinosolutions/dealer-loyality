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

async function debugInventory() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Create model references
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));

    // Get all products with expanded information
    console.log('\nFetching products with detailed info...');
    const products = await Product.find().lean();
    
    if (products.length === 0) {
      console.log('No products found in the database.');
      return;
    }
    
    console.log(`\nFound ${products.length} products in the database.`);
    
    // Get admin users
    const adminUsers = await User.find({ role: 'admin' }).lean();
    console.log(`\nFound ${adminUsers.length} admin users:`);
    adminUsers.forEach(admin => {
      console.log(`- Admin: ${admin.name || admin.email} (ID: ${admin._id})`);
    });
    
    // Get organizations
    const organizations = await Organization.find().lean();
    console.log(`\nFound ${organizations.length} organizations:`);
    organizations.forEach(org => {
      console.log(`- Org: ${org.name} (ID: ${org._id})`);
    });
    
    // Check each product
    console.log('\n== DETAILED PRODUCT INFORMATION ==');
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product._id}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Category: ${product.category || 'Not set'}`);
      console.log(`Price: ${product.price || 0}`);
      console.log(`Stock: ${product.stock || 0}`);
      console.log(`ReorderLevel: ${product.reorderLevel || 'Not set'}`);
      console.log(`Status: ${product.status || 'Not set'}`);
      
      // Check creator relationship
      const createdById = product.createdBy?.toString();
      console.log(`Created by: ${createdById || 'Unknown'}`);
      
      if (createdById) {
        const creator = adminUsers.find(u => u._id.toString() === createdById);
        if (creator) {
          console.log(`Creator name: ${creator.name || creator.email}`);
          console.log(`Creator role: ${creator.role}`);
        } else {
          console.log(`Warning: Creator not found in admin users list`);
        }
      }
      
      // Check organization relationship
      const orgId = product.organizationId?.toString();
      console.log(`Organization ID: ${orgId || 'Not set'}`);
      
      if (orgId) {
        const org = organizations.find(o => o._id.toString() === orgId);
        if (org) {
          console.log(`Organization name: ${org.name}`);
        } else {
          console.log(`Warning: Organization not found in orgs list`);
        }
      }
      
      // Check for missing critical fields
      const missingFields = [];
      if (product.stock === undefined) missingFields.push('stock');
      if (product.price === undefined) missingFields.push('price');
      if (!product.category) missingFields.push('category');
      if (!product.createdBy) missingFields.push('createdBy');
      if (!product.organizationId) missingFields.push('organizationId');
      
      if (missingFields.length > 0) {
        console.log(`❌ MISSING FIELDS: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All required fields present');
      }
    }

  } catch (error) {
    console.error('\nError debugging inventory:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
debugInventory(); 