import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string from environment or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

async function runTests() {
  console.log('MongoDB Debug Tool');
  console.log('=================');
  console.log(`Attempting to connect to: ${MONGODB_URI}`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`- ${collection.collectionName}`);
    });
    
    // Use raw database access to avoid schema issues
    const db = mongoose.connection.db;
    
    // Test purchase requests collection
    console.log('\nTesting purchase requests:');
    try {
      // Try both possible collection names
      const prCollection = db.collection('purchaserequests');
      const prCount = await prCollection.countDocuments();
      console.log(`- Found ${prCount} purchase requests`);
      
      if (prCount > 0) {
        // Get sample request
        const sampleRequest = await prCollection.findOne({});
        console.log('- Sample request:', JSON.stringify(sampleRequest, null, 2));
        
        // Log the field names and types
        const fields = Object.keys(sampleRequest);
        console.log('- Fields:', fields.join(', '));
        
        // Check userId field
        if (sampleRequest.userId) {
          console.log('- userId type:', typeof sampleRequest.userId);
          console.log('- userId value:', sampleRequest.userId.toString());
          console.log('- userId constructor:', sampleRequest.userId.constructor.name);
        }
        
        // Check clientId field if present
        if (sampleRequest.clientId) {
          console.log('- clientId type:', typeof sampleRequest.clientId);
          console.log('- clientId value:', sampleRequest.clientId.toString());
          console.log('- clientId constructor:', sampleRequest.clientId.constructor.name);
        }
      }
      
      // Check users collection
      console.log('\nTesting users collection:');
      const usersCollection = db.collection('users');
      const userCount = await usersCollection.countDocuments();
      console.log(`- Found ${userCount} users`);
      
      // Find admin users
      const adminCount = await usersCollection.countDocuments({ role: 'admin' });
      console.log(`- Found ${adminCount} admin users`);
      
      if (adminCount > 0) {
        const adminUser = await usersCollection.findOne({ role: 'admin' });
        console.log('- Sample admin:', JSON.stringify({
          _id: adminUser._id.toString(),
          email: adminUser.email,
          role: adminUser.role,
          organizationId: adminUser.organizationId ? adminUser.organizationId.toString() : null
        }, null, 2));
        
        // Check if organizationId exists
        if (adminUser.organizationId) {
          const orgId = adminUser.organizationId.toString();
          console.log('- Admin organization ID:', orgId);
          
          // Find clients with this organization
          const clientsWithOrg = await usersCollection.find({ 
            role: 'client',
            organizationId: adminUser.organizationId 
          }).toArray();
          
          console.log(`- Found ${clientsWithOrg.length} clients with exact organization match`);
          
          // Get all clients and filter manually
          const allClients = await usersCollection.find({ role: 'client' }).toArray();
          
          const manuallyFilteredClients = allClients.filter(client => 
            client.organizationId && client.organizationId.toString() === orgId
          );
          
          console.log(`- Found ${manuallyFilteredClients.length} clients with string comparison`);
          
          if (manuallyFilteredClients.length > 0) {
            // Get their IDs to check purchase requests
            const clientIds = manuallyFilteredClients.map(c => c._id);
            
            // Check purchase requests for these clients
            const purchaseRequests = await prCollection.find({
              $or: [
                { userId: { $in: clientIds } },
                { clientId: { $in: clientIds } } // Try both field names
              ]
            }).toArray();
            
            console.log(`- Found ${purchaseRequests.length} purchase requests for clients in admin's organization`);
            
            if (purchaseRequests.length > 0) {
              console.log('- Sample purchase request:', JSON.stringify(purchaseRequests[0], null, 2));
            }
          }
        }
      }
    } catch (error) {
      console.error(`\n❌ Error testing collections: ${error.message}`);
      console.error(error.stack);
    }
    
  } catch (error) {
    console.error(`\n❌ MongoDB connection error: ${error.message}`);
    console.error(error.stack);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\nSuccessfully disconnected from MongoDB');
    } catch (err) {
      console.error(`Error disconnecting: ${err.message}`);
    }
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 