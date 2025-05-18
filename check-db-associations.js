import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define models
const ProductSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);

async function checkDatabaseAssociations() {
  try {
    console.log('Checking database associations...');

    // Get all users
    const users = await User.find({});
    console.log(`\nFound ${users.length} total users`);
    
    // Group users by role
    const usersByRole = {};
    users.forEach(user => {
      const role = user.role || 'unknown';
      if (!usersByRole[role]) usersByRole[role] = [];
      usersByRole[role].push(user);
    });
    
    // Print user counts by role
    Object.keys(usersByRole).forEach(role => {
      console.log(`- ${role}: ${usersByRole[role].length} users`);
    });

    // Get all products
    const products = await Product.find({});
    console.log(`\nFound ${products.length} total products`);
    
    // Group products by creator
    const productsByCreator = {};
    products.forEach(product => {
      const createdBy = product.createdBy ? product.createdBy.toString() : 'unknown';
      if (!productsByCreator[createdBy]) productsByCreator[createdBy] = [];
      productsByCreator[createdBy].push(product);
    });
    
    console.log('\nProduct details:');
    
    // Analyze each product in more detail
    for (const product of products) {
      console.log(`\nProduct: ${product.name} (${product._id})`);
      console.log(`- Created by: ${product.createdBy || 'unknown'}`);
      console.log(`- Organization: ${product.organizationId || 'unknown'}`);
      console.log(`- isClientUploaded: ${product.isClientUploaded}`);
      console.log(`- Status: ${product.status || 'unknown'}`);
      
      // Find creator
      const creator = users.find(u => u._id.toString() === (product.createdBy ? product.createdBy.toString() : ''));
      if (creator) {
        console.log(`- Creator name: ${creator.name} (${creator.role})`);
      } else {
        console.log(`- Creator not found!`);
      }
      
      // For products created by admins, check which clients can potentially see them
      if (creator && creator.role === 'admin') {
        const visibleToClients = users.filter(u => 
          u.role === 'client' && 
          u.organizationId && 
          product.organizationId && 
          u.organizationId.toString() === product.organizationId.toString()
        );
        
        console.log(`- Visible to ${visibleToClients.length} clients`);
        
        if (visibleToClients.length > 0) {
          visibleToClients.forEach(client => {
            console.log(`  - Client: ${client.name} (${client._id})`);
          });
        }
      }
    }
    
    // Print user details for admins and clients
    console.log('\nAdmin users:');
    const adminUsers = usersByRole['admin'] || [];
    for (const admin of adminUsers) {
      console.log(`\nAdmin: ${admin.name} (${admin._id})`);
      console.log(`- Organization: ${admin.organizationId || 'unknown'}`);
      
      // Find clients created by this admin
      const createdClients = users.filter(u => 
        u.role === 'client' && 
        u.createdBy && 
        u.createdBy.toString() === admin._id.toString()
      );
      
      console.log(`- Created ${createdClients.length} clients`);
      
      if (createdClients.length > 0) {
        createdClients.forEach(client => {
          console.log(`  - Client: ${client.name} (${client._id})`);
          console.log(`    - Organization: ${client.organizationId || 'unknown'}`);
          console.log(`    - Same org as admin: ${client.organizationId && admin.organizationId && 
            client.organizationId.toString() === admin.organizationId.toString()}`);
        });
      }
      
      // Find products created by this admin
      const adminProducts = products.filter(p => 
        p.createdBy && 
        p.createdBy.toString() === admin._id.toString()
      );
      
      console.log(`- Created ${adminProducts.length} products`);
      
      if (adminProducts.length > 0) {
        adminProducts.forEach(product => {
          console.log(`  - Product: ${product.name} (${product._id})`);
          console.log(`    - Organization: ${product.organizationId || 'unknown'}`);
          console.log(`    - Same org as admin: ${product.organizationId && admin.organizationId && 
            product.organizationId.toString() === admin.organizationId.toString()}`);
        });
      }
    }

    console.log('\nFinished checking database associations!');
    process.exit(0);
  } catch (error) {
    console.error('Error checking database associations:', error);
    process.exit(1);
  }
}

// Run the function
checkDatabaseAssociations(); 