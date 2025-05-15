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

async function initializeModels() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} existing collections:`);
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Initialize Product model
    console.log('\nInitializing Product model...');
    
    // Clear existing model if it exists
    if (mongoose.models.Product) {
      delete mongoose.models.Product;
    }
    
    // Define Product Schema
    const productSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String, default: '' },
      sku: { type: String, required: true },
      category: { type: String, default: 'General' },
      price: { type: Number, required: true, min: 0 },
      loyaltyPoints: { type: Number, default: 0, min: 0 },
      stock: { type: Number, default: 0, min: 0 },
      reorderLevel: { type: Number, default: 5 },
      reservedStock: { type: Number, default: 0 },
      minOrderQuantity: { type: Number, default: 1, min: 1 },
      maxOrderQuantity: { type: Number, default: null },
      images: [{ type: String }],
      specifications: [{
        name: { type: String },
        value: { type: String }
      }],
      deals: [{
        name: { type: String },
        description: { type: String },
        quantity: { type: Number },
        discountPercentage: { type: Number },
        bonusLoyaltyPoints: { type: Number },
        startDate: { type: Date },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true }
      }],
      status: { 
        type: String, 
        enum: ['active', 'inactive', 'discontinued'], 
        default: 'active' 
      },
      organizationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization',
        required: true
      },
      createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
      },
      isClientUploaded: { type: Boolean, default: false },
      clientInventory: {
        initialStock: { type: Number },
        currentStock: { type: Number },
        reorderLevel: { type: Number },
        lastUpdated: { type: Date, default: Date.now }
      }
    }, { timestamps: true });
    
    // Add any product methods/hooks here if needed
    
    // Create the Product model
    const Product = mongoose.model('Product', productSchema);
    console.log('Product model initialized successfully');
    
    // Initialize Order model
    console.log('\nInitializing Order model...');
    
    // Clear existing model if it exists
    if (mongoose.models.Order) {
      delete mongoose.models.Order;
    }
    
    // Define Order Schema
    const orderSchema = new mongoose.Schema({
      orderNumber: { type: String, required: true, unique: true },
      customer: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }
      },
      items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        loyaltyPoints: { type: Number, default: 0 }
      }],
      totalAmount: { type: Number, required: true },
      totalLoyaltyPoints: { type: Number, default: 0 },
      status: { 
        type: String, 
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending' 
      },
      paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'failed', 'refunded'], 
        default: 'pending' 
      },
      shippingAddress: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      },
      shippingMethod: String,
      organizationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization',
        required: true
      },
      notes: String
    }, { timestamps: true });
    
    // Create the Order model
    const Order = mongoose.model('Order', orderSchema);
    console.log('Order model initialized successfully');
    
    // Initialize PurchaseRequest model
    console.log('\nInitializing PurchaseRequest model...');
    
    // Clear existing model if it exists
    if (mongoose.models.PurchaseRequest) {
      delete mongoose.models.PurchaseRequest;
    }
    
    // Define PurchaseRequest Schema
    const purchaseRequestSchema = new mongoose.Schema({
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true
      },
      productName: { type: String },
      clientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
      },
      clientName: { type: String },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      notes: { type: String },
      rejectionReason: { type: String },
      orderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order'
      },
      organizationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization'
      }
    }, { timestamps: true });
    
    // Create the PurchaseRequest model
    const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);
    console.log('PurchaseRequest model initialized successfully');
    
    // Check if the models were created successfully
    console.log('\nVerifying model creation:');
    console.log('- Product model:', !!mongoose.models.Product);
    console.log('- Order model:', !!mongoose.models.Order);
    console.log('- PurchaseRequest model:', !!mongoose.models.PurchaseRequest);
    
    // Log the model schemas
    console.log('\nProduct model schema paths:');
    console.log(Object.keys(mongoose.models.Product.schema.paths).join(', '));
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ All models initialized successfully!');
    console.log('\x1b[32m%s\x1b[0m', 'The application should now be able to create products and process orders.');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error initializing models:');
    console.error(error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  }
}

// Run the initialization function
initializeModels(); 