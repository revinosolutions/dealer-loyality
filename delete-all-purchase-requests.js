// Simple script to delete all purchase requests
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/dealer-loyalty';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');

    // Define a minimal PurchaseRequest model
    const PurchaseRequest = mongoose.model('PurchaseRequest', 
      new mongoose.Schema({}, { strict: false, collection: 'purchaserequests' }));

    // Count and delete all purchase requests
    const count = await PurchaseRequest.countDocuments({});
    console.log(`Found ${count} purchase requests in the database`);

    if (count === 0) {
      console.log('No purchase requests to delete.');
    } else {
      // Delete all records
      const result = await PurchaseRequest.deleteMany({});
      console.log(`DELETED ${result.deletedCount} PURCHASE REQUESTS FROM THE DATABASE`);
    }
    
    // Disconnect and exit
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 