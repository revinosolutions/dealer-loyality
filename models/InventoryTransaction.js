import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['admin_deduction', 'client_allocation', 'client_consumption', 'client_return', 'inventory_adjustment', 'stock_receive'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  purchaseRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRequest'
  },
  clientInventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClientInventory'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Static method to create a transaction record
inventoryTransactionSchema.statics.recordTransaction = async function(data) {
  try {
    const transaction = new this(data);
    await transaction.save();
    return transaction;
  } catch (error) {
    console.error('Error recording inventory transaction:', error);
    throw error;
  }
};

// Static method to get product transaction history
inventoryTransactionSchema.statics.getProductHistory = async function(productId, limit = 100) {
  return this.find({ productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email role')
    .populate('clientId', 'name email company');
};

// Static method to get client transaction history
inventoryTransactionSchema.statics.getClientHistory = async function(clientId, limit = 100) {
  return this.find({ clientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('productId', 'name sku')
    .populate('userId', 'name role');
};

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

export default InventoryTransaction; 