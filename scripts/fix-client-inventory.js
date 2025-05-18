// Direct client inventory fix script
// This script directly inserts a product into the client's inventory

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting direct client inventory fix...');

// Client ID to fix (IMPORTANT: Replace with your client ID if different)
const CLIENT_ID = '6829b20dd20296da9beea0b4';
const CLIENT_ID_OBJ = new mongoose.Types.ObjectId(CLIENT_ID);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log('MongoDB connected successfully');
    executeRepair();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Product schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  sku: String,
  category: String,
  price: Number,
  loyaltyPoints: Number,
  stock: Number,
  reorderLevel: Number,
  reservedStock: Number,
  images: [String],
  specifications: [Object],
  status: String,
  isClientUploaded: Boolean,
  createdBy: mongoose.Schema.Types.Mixed,
  organizationId: mongoose.Schema.Types.Mixed,
  clientInventory: {
    initialStock: Number,
    currentStock: Number,
    reorderLevel: Number,
    lastUpdated: Date
  },
  createdAt: Date,
  updatedAt: Date
});

// Purchase request schema
const purchaseRequestSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.Mixed,
  productName: String,
  clientId: mongoose.Schema.Types.Mixed,
  clientName: String,
  quantity: Number,
  price: Number,
  notes: String,
  status: String,
  rejectionReason: String,
  organizationId: mongoose.Schema.Types.Mixed,
  createdAt: Date,
  updatedAt: Date
});

// Register models
const Product = mongoose.model('Product', productSchema);
const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

async function executeRepair() {
  try {
    // 1. Check for existing client products
    console.log(`Checking for existing products for client: ${CLIENT_ID}`);
    const existingProducts = await Product.find({ createdBy: CLIENT_ID_OBJ });
    console.log(`Found ${existingProducts.length} existing products`);

    // 2. Check for approved purchase requests
    console.log('Checking for approved purchase requests...');
    const approvedRequests = await PurchaseRequest.find({ 
      clientId: CLIENT_ID_OBJ,
      status: 'approved'
    }).populate('productId');
    console.log(`Found ${approvedRequests.length} approved purchase requests`);

    // 3. Create inventory items based on approved requests
    let created = 0;
    let updated = 0;
    
    if (approvedRequests.length > 0) {
      for (const request of approvedRequests) {
        console.log(`Processing request for product: ${request.productName || 'Unknown'}`);
        
        // Look for an existing client product with the same name
        const existingProduct = existingProducts.find(p => 
          p.name === request.productName || 
          (request.productId && typeof request.productId === 'object' && p.name === request.productId.name)
        );
        
        if (existingProduct) {
          // Update existing product
          console.log(`Updating existing product: ${existingProduct.name}`);
          
          // Ensure clientInventory exists
          if (!existingProduct.clientInventory) {
            existingProduct.clientInventory = {
              initialStock: request.quantity,
              currentStock: request.quantity,
              reorderLevel: 5,
              lastUpdated: new Date()
            };
          } else {
            // Add to existing stock
            existingProduct.clientInventory.currentStock += request.quantity;
            existingProduct.clientInventory.lastUpdated = new Date();
          }
          
          // Update regular stock as well
          existingProduct.stock = existingProduct.clientInventory.currentStock;
          existingProduct.updatedAt = new Date();
          
          // Save changes
          await existingProduct.save();
          console.log(`Updated product stock to: ${existingProduct.clientInventory.currentStock}`);
          updated++;
        } else {
          // Get admin product details if available
          const adminProduct = request.productId && typeof request.productId === 'object' 
            ? request.productId 
            : null;
            
          // Create new client product
          console.log(`Creating new client product for: ${request.productName}`);
          
          const uniqueSku = `CLIENT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          
          const newProduct = new Product({
            name: request.productName || (adminProduct ? adminProduct.name : `Product ${uniqueSku}`),
            description: adminProduct ? adminProduct.description : `Client product created from purchase request`,
            sku: uniqueSku,
            category: adminProduct ? adminProduct.category : 'General',
            price: request.price || (adminProduct ? adminProduct.price : 0),
            loyaltyPoints: adminProduct ? adminProduct.loyaltyPoints : 0,
            stock: request.quantity,
            reorderLevel: 5,
            isClientUploaded: true,
            createdBy: CLIENT_ID_OBJ,
            organizationId: request.organizationId || (adminProduct ? adminProduct.organizationId : null),
            status: 'active',
            clientInventory: {
              initialStock: request.quantity,
              currentStock: request.quantity,
              reorderLevel: 5,
              lastUpdated: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await newProduct.save();
          console.log(`Created new client product: ${newProduct.name} with ID: ${newProduct._id}`);
          created++;
        }
      }
    }
    
    // 4. If no approved requests, create a sample product
    if (approvedRequests.length === 0 && existingProducts.length === 0) {
      console.log('No approved requests found, creating sample product...');
      
      const sampleProduct = new Product({
        name: 'Sample Client Inventory Item',
        description: 'This is a sample inventory item created by the repair script',
        sku: `SAMPLE-${Date.now()}`,
        category: 'Sample',
        price: 10,
        loyaltyPoints: 5,
        stock: 10,
        reorderLevel: 3,
        isClientUploaded: true,
        createdBy: CLIENT_ID_OBJ,
        status: 'active',
        clientInventory: {
          initialStock: 10,
          currentStock: 10,
          reorderLevel: 3,
          lastUpdated: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await sampleProduct.save();
      console.log(`Created sample product: ${sampleProduct.name} with ID: ${sampleProduct._id}`);
      created++;
    }
    
    // 5. Report results
    console.log('======= REPAIR COMPLETED =======');
    console.log(`Created: ${created} products`);
    console.log(`Updated: ${updated} products`);
    
    // Print all client products after repair
    const finalProducts = await Product.find({ createdBy: CLIENT_ID_OBJ });
    console.log(`\nClient now has ${finalProducts.length} products in inventory:`);
    
    finalProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (ID: ${product._id})`);
      console.log(`   - Stock: ${product.clientInventory?.currentStock || product.stock}`);
      console.log(`   - SKU: ${product.sku}`);
      console.log(`   - Client Inventory: ${product.clientInventory ? 'Yes' : 'No'}`);
    });
    
    console.log('\nFinishing and closing connection...');
    
    // Close MongoDB connection after a delay
    setTimeout(() => {
      mongoose.connection.close();
      console.log('MongoDB connection closed');
      console.log('Done!');
    }, 1000);
  } catch (error) {
    console.error('Error during repair:', error);
    mongoose.connection.close();
    process.exit(1);
  }
} 