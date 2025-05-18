import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define models
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  status: String,
  isClientUploaded: Boolean,
  organizationId: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId
}));

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId
}));

async function fixAdminProductsVisibility() {
  try {
    console.log('Starting admin product visibility fix...');

    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`Found ${adminUsers.length} admin users`);

    // Get all client users
    const clientUsers = await User.find({ role: 'client' });
    console.log(`Found ${clientUsers.length} client users`);

    // For each admin, get their products and ensure their clients can see them
    for (const admin of adminUsers) {
      console.log(`\nProcessing admin: ${admin.name} (${admin._id})`);
      console.log(`Admin's organization: ${admin.organizationId}`);

      // Find clients created by this admin
      const adminClients = clientUsers.filter(client => 
        client.createdBy && client.createdBy.toString() === admin._id.toString());
      
      console.log(`Admin has ${adminClients.length} clients`);

      // Get admin's products
      const adminProducts = await Product.find({ 
        createdBy: admin._id,
        isClientUploaded: { $ne: true }
      });
      
      console.log(`Admin has ${adminProducts.length} products`);

      // Ensure all admin's clients have the same organizationId as the admin
      for (const client of adminClients) {
        if (!client.organizationId || 
            client.organizationId.toString() !== admin.organizationId.toString()) {
          
          console.log(`Updating client ${client.name} (${client._id}) organization to match admin`);
          
          await User.updateOne(
            { _id: client._id },
            { $set: { organizationId: admin.organizationId } }
          );
          
          console.log(`Updated client ${client.name} organization ID to ${admin.organizationId}`);
        } else {
          console.log(`Client ${client.name} already has correct organization ID`);
        }
      }

      // Ensure all admin's products have the correct organizationId
      for (const product of adminProducts) {
        if (!product.organizationId || 
            product.organizationId.toString() !== admin.organizationId.toString()) {
          
          console.log(`Updating product ${product.name} (${product._id}) organization to match admin`);
          
          await Product.updateOne(
            { _id: product._id },
            { $set: { organizationId: admin.organizationId } }
          );
          
          console.log(`Updated product ${product.name} organization ID to ${admin.organizationId}`);
        } else {
          console.log(`Product ${product.name} already has correct organization ID`);
        }
      }
    }

    console.log('\nFinished updating admin product visibility!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin product visibility:', error);
    process.exit(1);
  }
}

// Run the function
fixAdminProductsVisibility(); 