import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  movementType: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'transfer'],
    required: true
  },
  referenceOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  previousStock: {
    type: Number
  },
  newStock: {
    type: Number
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
inventorySchema.index({ productId: 1 });
inventorySchema.index({ date: 1 });
inventorySchema.index({ movementType: 1 });
inventorySchema.index({ location: 1 });
inventorySchema.index({ batchNumber: 1 });

// Static method to record stock movement
inventorySchema.statics.recordMovement = async function(data) {
  const { productId, location, quantity, movementType, performedBy, referenceOrder, batchNumber, notes, metadata } = data;
  
  // Get the product to update its stock
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  const previousStock = product.stock;
  let newStock = previousStock;
  
  // Update product stock based on movement type
  switch (movementType) {
    case 'in':
      newStock = previousStock + quantity;
      product.stock = newStock;
      await product.save();
      break;
    case 'out':
      if (previousStock < quantity) {
        throw new Error('Not enough stock available');
      }
      newStock = previousStock - quantity;
      product.stock = newStock;
      await product.save();
      break;
    case 'adjustment':
      newStock = quantity; // Direct set to the new quantity
      product.stock = quantity;
      await product.save();
      break;
    case 'transfer':
      // Transfer doesn't change total stock, just location
      // This would require additional logic for location-based inventory
      break;
    default:
      throw new Error('Invalid movement type');
  }
  
  // Create inventory record
  return this.create({
    productId,
    location,
    quantity,
    batchNumber,
    movementType,
    referenceOrder,
    performedBy,
    notes,
    previousStock,
    newStock,
    metadata,
    date: new Date()
  });
};

// Static method to get inventory history for a product
inventorySchema.statics.getProductHistory = function(productId, options = {}) {
  const query = { productId };
  
  if (options.startDate && options.endDate) {
    query.date = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  if (options.movementType) {
    query.movementType = options.movementType;
  }
  
  if (options.location) {
    query.location = options.location;
  }
  
  return this.find(query)
    .sort({ date: -1 })
    .populate('performedBy', 'name email role')
    .populate('referenceOrder')
    .exec();
};

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;