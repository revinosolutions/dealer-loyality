import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

async function testPurchaseRequestApproval() {
  try {
    await connectDB();
    console.log('Connected to database');

    // 1. Find a pending purchase request
    const pendingRequest = await PurchaseRequest.findOne({ status: 'pending' });
    
    if (!pendingRequest) {
      console.log('No pending purchase requests found.');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`Found pending request: ${pendingRequest._id}`);
    console.log('Request details:', {
      productId: pendingRequest.productId,
      clientId: pendingRequest.clientId,
      quantity: pendingRequest.quantity,
      price: pendingRequest.price
    });

    // 2. Find the admin product
    const adminProduct = await Product.findById(pendingRequest.productId);
    if (!adminProduct) {
      console.error(`Product not found: ${pendingRequest.productId}`);
      await mongoose.connection.close();
      return;
    }
    
    console.log(`Found admin product: ${adminProduct.name}, Stock: ${adminProduct.stock}`);

    // Check if there is enough stock
    if (adminProduct.stock < pendingRequest.quantity) {
      console.error('Not enough stock available', {
        available: adminProduct.stock,
        requested: pendingRequest.quantity
      });
      await mongoose.connection.close();
      return;
    }

    // 3. Find an admin user to use as dealer
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found to use as dealer');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`Found admin user: ${admin._id}`);

    // 4. Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 5. Find or create client product
      let clientProduct = await Product.findOne({
        name: adminProduct.name,
        'clientInventory.initialStock': { $exists: true },
        createdBy: pendingRequest.clientId
      }).session(session);
      
      let isNewProduct = false;
      
      if (!clientProduct) {
        console.log(`Creating new client product for client ${pendingRequest.clientId}`);
        isNewProduct = true;
        
        // Generate a unique SKU that avoids conflicts
        const uniqueSuffix = Date.now().toString().substring(8) + Math.floor(Math.random() * 10000);
        const clientSku = `CLIENT-${adminProduct.sku}-${uniqueSuffix}`;
        
        clientProduct = new Product({
          name: adminProduct.name,
          description: adminProduct.description,
          sku: clientSku,
          category: adminProduct.category,
          price: adminProduct.price,
          loyaltyPoints: adminProduct.loyaltyPoints,
          stock: 0, // Client products use clientInventory.currentStock instead
          isClientUploaded: true,
          createdBy: pendingRequest.clientId,
          organizationId: pendingRequest.organizationId || adminProduct.organizationId,
          clientInventory: {
            initialStock: pendingRequest.quantity,
            currentStock: pendingRequest.quantity,
            reorderLevel: adminProduct.reorderLevel || 5,
            lastUpdated: new Date()
          }
        });
      } else {
        // Update existing client product inventory
        console.log(`Updating existing client product: ${clientProduct._id}, current stock: ${clientProduct.clientInventory.currentStock}`);
        clientProduct.clientInventory.currentStock += pendingRequest.quantity;
        clientProduct.clientInventory.lastUpdated = new Date();
      }
      
      // Save client product
      await clientProduct.save({ session });
      console.log(`Client product saved: ${clientProduct._id}, new stock: ${clientProduct.clientInventory.currentStock}`);
      
      // 6. Create an order with all required fields
      const orderData = {
        orderNumber: `PR-TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`, // Generate unique order number
        clientId: pendingRequest.clientId,
        dealerId: admin._id, // Use the admin user's ID as dealer
        items: [{
          productId: adminProduct._id,
          quantity: pendingRequest.quantity,
          price: pendingRequest.price,
          lineTotal: pendingRequest.price * pendingRequest.quantity
        }],
        total: pendingRequest.price * pendingRequest.quantity,
        status: 'completed'
      };
      
      console.log(`Creating order with data:`, orderData);
      const order = new Order(orderData);
      await order.save({ session });
      console.log(`Order created: ${order._id}`);
      
      // 7. Update the purchase request
      pendingRequest.status = 'approved';
      pendingRequest.orderId = order._id;
      await pendingRequest.save({ session });
      console.log(`Purchase request updated to approved: ${pendingRequest._id}`);
      
      // 8. Update admin product inventory
      const previousStock = adminProduct.stock;
      adminProduct.stock -= pendingRequest.quantity;
      await adminProduct.save({ session });
      console.log(`Admin product stock updated: ${previousStock} -> ${adminProduct.stock}`);
      
      // 9. Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      // Print final summary
      console.log('\nFinal result:');
      console.log({
        request: {
          id: pendingRequest._id,
          status: pendingRequest.status,
          orderId: pendingRequest.orderId
        },
        adminProduct: {
          id: adminProduct._id,
          name: adminProduct.name,
          previousStock,
          newStock: adminProduct.stock
        },
        clientProduct: {
          id: clientProduct._id,
          name: clientProduct.name,
          stock: clientProduct.clientInventory.currentStock,
          isNew: isNewProduct
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          total: order.total,
          status: order.status
        }
      });
    } catch (error) {
      console.error('Transaction error:', error);
      await session.abortTransaction();
      console.log('Transaction aborted');
    } finally {
      session.endSession();
      console.log('Session ended');
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testPurchaseRequestApproval(); 