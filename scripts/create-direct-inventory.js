// Script to create a direct client inventory item
// This uses a different approach to create a client inventory item

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Client ID to fix
const CLIENT_ID = '6829b20dd20296da9beea0b4';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log('MongoDB connected successfully');
    createDirectInventory();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function createDirectInventory() {
  try {
    // Get current timestamp for unique values
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 100000);
    
    // Define the product with all required fields
    const newProduct = {
      name: `Emergency Inventory Item ${timestamp}`,
      description: "This product was created directly via MongoDB to fix client inventory issues",
      sku: `EMERGENCY-${randomSuffix}`,
      category: "Emergency Fix",
      price: 100,
      loyaltyPoints: 10,
      stock: 25,
      reorderLevel: 5,
      reservedStock: 0,
      images: [],
      specifications: [],
      status: "active",
      isClientUploaded: true,
      createdBy: new mongoose.Types.ObjectId(CLIENT_ID),
      organizationId: new mongoose.Types.ObjectId("6829b116d20296da9bee9d74"), // Default org ID
      clientInventory: {
        initialStock: 25,
        currentStock: 25,
        reorderLevel: 5,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("Creating direct product with:", {
      name: newProduct.name,
      sku: newProduct.sku,
      stock: newProduct.stock,
      clientId: newProduct.createdBy
    });
    
    // Insert directly using MongoDB native driver
    const db = mongoose.connection.db;
    
    // Get the products collection
    const productsCollection = db.collection('products');
    
    // Insert the new product
    const result = await productsCollection.insertOne(newProduct);
    
    if (result.acknowledged) {
      console.log(`Successfully created product with ID: ${result.insertedId}`);
      console.log(`This product should now appear in the client's inventory`);
      
      // Query to confirm it exists
      const createdProduct = await productsCollection.findOne({ _id: result.insertedId });
      console.log("Inserted product details:", {
        id: createdProduct._id,
        name: createdProduct.name,
        stock: createdProduct.stock,
        clientInventory: createdProduct.clientInventory
      });
      
      // Check what other client products exist
      const clientProducts = await productsCollection.find({ 
        createdBy: new mongoose.Types.ObjectId(CLIENT_ID)
      }).toArray();
      
      console.log(`\nFound ${clientProducts.length} total client products:`);
      clientProducts.forEach((p, idx) => {
        console.log(`${idx+1}. ${p.name} (${p._id})`);
        console.log(`   Stock: ${p.stock}, ClientInventory: ${p.clientInventory ? 'Yes' : 'No'}`);
        if (p.clientInventory) {
          console.log(`   ClientInventory CurrentStock: ${p.clientInventory.currentStock}`);
        }
      });
    } else {
      console.error("Failed to insert product");
    }
    
    // Close connection
    setTimeout(() => {
      mongoose.connection.close();
      console.log("MongoDB connection closed");
    }, 1000);
  } catch (error) {
    console.error("Error creating direct inventory:", error);
    mongoose.connection.close();
    process.exit(1);
  }
} 