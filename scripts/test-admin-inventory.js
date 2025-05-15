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

async function testAdminInventory() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get admin users
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const adminUsers = await User.find({ role: 'admin' }).lean();
    
    if (adminUsers.length === 0) {
      console.error('No admin users found in the database');
      return;
    }
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(admin => {
      console.log(`- Admin: ${admin.name || admin.email} (ID: ${admin._id})`);
    });
    
    // Select first admin to test with
    const testAdmin = adminUsers[0];
    console.log(`\nTesting with admin: ${testAdmin.name || testAdmin.email} (ID: ${testAdmin._id})`);
    
    // Define Product model
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    
    // 1. Test basic product retrieval
    console.log('\n1. Testing basic product retrieval (no filters):');
    const allProducts = await Product.find().lean();
    console.log(`Found ${allProducts.length} products total in database`);
    
    // 2. Test product retrieval with createdBy filter (simulating default client behavior)
    console.log('\n2. Testing products with createdBy filter:');
    const clientProducts = await Product.find({
      createdBy: testAdmin._id
    }).lean();
    console.log(`Found ${clientProducts.length} products created by admin ${testAdmin._id}`);
    
    if (clientProducts.length === 0 && allProducts.length > 0) {
      console.log('\n🚨 POTENTIAL ISSUE FOUND: Products exist but none are created by this admin');
      console.log('This explains why the admin inventory appears empty');
      
      // Get the actual creators
      if (allProducts.length > 0) {
        const creators = new Set(allProducts.map(p => String(p.createdBy)));
        console.log('Products are created by:', Array.from(creators));
        
        // For each creator ID, look up the user
        for (const creatorId of creators) {
          if (!creatorId) {
            console.log('Some products have no createdBy field');
            continue;
          }
          
          try {
            const creator = await User.findById(creatorId).lean();
            if (creator) {
              console.log(`Creator ${creatorId} is: ${creator.name || creator.email} (role: ${creator.role})`);
            } else {
              console.log(`Creator ${creatorId} not found in database`);
            }
          } catch (err) {
            console.error(`Error looking up creator ${creatorId}:`, err);
          }
        }
      }
    }
    
    // 3. Generate sample products for this admin
    if (clientProducts.length === 0) {
      console.log('\n🔧 GENERATING TEST PRODUCTS FOR ADMIN:');
      
      // Add some test products for this admin
      const testProducts = [
        {
          name: 'Test Admin Product 1',
          sku: `ADMIN-${Date.now()}-1`,
          description: 'A test product for admin',
          category: 'Test Category',
          price: 100,
          loyaltyPoints: 10,
          stock: 50,
          reorderLevel: 10,
          status: 'active',
          createdBy: testAdmin._id,
          organizationId: testAdmin.organizationId || null
        },
        {
          name: 'Test Admin Product 2',
          sku: `ADMIN-${Date.now()}-2`,
          description: 'Another test product for admin',
          category: 'Test Category',
          price: 200,
          loyaltyPoints: 20,
          stock: 30,
          reorderLevel: 5,
          status: 'active',
          createdBy: testAdmin._id,
          organizationId: testAdmin.organizationId || null
        }
      ];
      
      try {
        const result = await Product.create(testProducts);
        console.log(`Successfully created ${result.length} test products for admin`);
        
        // Verify the products were created
        const verifyProducts = await Product.find({
          createdBy: testAdmin._id
        }).lean();
        console.log(`Now have ${verifyProducts.length} products for admin ${testAdmin._id}`);
      } catch (err) {
        console.error('Error creating test products:', err);
      }
    }
    
    // 4. Provide a solution
    console.log('\n🔍 DIAGNOSIS AND SOLUTION:');
    console.log('If products exist but aren\'t showing up in the admin inventory, it\'s likely because:');
    console.log('1. The products aren\'t associated with the logged-in admin (createdBy field)');
    console.log('2. The inventory context is filtering by createdBy even for admin users');
    
    console.log('\nSOLUTION:');
    console.log('1. Update the getProducts function to NOT filter by createdBy for admin users');
    console.log('2. Ensure newly created products have the correct createdBy field set to the admin\'s ID');
    console.log('3. Add the organization ID to products when they\'re created');

  } catch (error) {
    console.error('\nError in test-admin-inventory script:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
testAdminInventory(); 