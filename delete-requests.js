// CommonJS script to delete all purchase requests
const mongoose = require('mongoose');

// MongoDB connection string
const uri = 'mongodb://localhost:27017/dealer-loyalty';

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Create a schema-less model (will use existing collection)
    const PurchaseRequestSchema = new mongoose.Schema({}, { 
      strict: false,
      collection: 'purchaserequests' // Match the actual collection name
    });
    
    const PurchaseRequest = mongoose.model('PurchaseRequest', PurchaseRequestSchema);
    
    // Find how many purchase requests exist
    const count = await PurchaseRequest.countDocuments();
    console.log(`Found ${count} purchase requests`);
    
    if (count > 0) {
      // Delete them all
      const result = await PurchaseRequest.deleteMany({});
      console.log(`Deleted ${result.deletedCount} purchase requests`);
    } else {
      console.log('No purchase requests to delete');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('Done');
  })
  .catch(err => {
    console.error('Error:', err);
  }); 