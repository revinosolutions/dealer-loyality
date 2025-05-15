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

async function verifyInventoryFix() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Create model references
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Get admin users
    const adminUsers = await User.find({ role: 'admin' }).lean();
    if (adminUsers.length === 0) {
      console.error('No admin users found. Cannot verify fix.');
      return;
    }
    
    const testAdmin = adminUsers[0];
    console.log(`Testing with admin user: ${testAdmin.name || testAdmin.email} (ID: ${testAdmin._id})`);
    
    // Count total products
    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
    // Count products created by this admin
    const adminProducts = await Product.find({ createdBy: testAdmin._id }).countDocuments();
    console.log(`Products created by this admin: ${adminProducts}`);
    
    // Simulate the fixed inventory query (no filter for admin)
    console.log('\nSimulating inventory queries:');
    
    // 1. OLD BEHAVIOR - with createdBy filter (problematic for admin)
    console.log('\n1. OLD BEHAVIOR - Using createdBy filter (original issue):');
    const oldBehaviorResult = await Product.find({ createdBy: testAdmin._id }).lean();
    console.log(`Products returned: ${oldBehaviorResult.length}`);
    
    // 2. NEW BEHAVIOR - no filter for admin users
    console.log('\n2. NEW BEHAVIOR - No filter for admin users (our fix):');
    const newBehaviorResult = await Product.find({}).lean();
    console.log(`Products returned: ${newBehaviorResult.length}`);
    
    // 3. Test modified behavior - we only want the difference
    console.log('\n3. PRODUCTS THAT WOULD NOW BE VISIBLE:');
    const productsGained = newBehaviorResult.filter(p => 
      !oldBehaviorResult.some(op => op._id.toString() === p._id.toString())
    );
    
    if (productsGained.length > 0) {
      console.log(`✅ FIX VERIFICATION: Admin would now see ${productsGained.length} additional products`);
      
      productsGained.forEach((product, index) => {
        console.log(`Product ${index+1}: ${product.name} (created by: ${product.createdBy})`);
        
        // Look up creator info
        const creatorId = product.createdBy?.toString();
        if (creatorId) {
          const creator = adminUsers.find(u => u._id.toString() === creatorId);
          if (creator) {
            console.log(`  Creator: ${creator.name || creator.email} (${creator.role})`);
          }
        }
      });
    } else if (totalProducts === adminProducts) {
      console.log('✅ All products are already created by this admin, so the fix will not change anything');
    } else {
      console.log('❓ No difference found between old and new behavior. This is unexpected.');
    }

    console.log('\nSUMMARY:');
    console.log('- Before fix: Admin would only see products they created themselves');
    console.log('- After fix: Admin will see ALL products in the system');
    console.log(`- Based on current data: Admin will see ${newBehaviorResult.length} products instead of ${oldBehaviorResult.length}`);

  } catch (error) {
    console.error('\nError verifying inventory fix:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
verifyInventoryFix(); 