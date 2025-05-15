import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  orderDate: {
    type: Date,
    default: Date.now
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'cash', 'check', 'other'],
    default: 'credit_card'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    receiptUrl: String,
    notes: String
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  notes: String,
  trackingNumber: String,
  shippingMethod: String,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add status to history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
      updatedBy: this.lastModifiedBy
    });
  }
  next();
});

// Calculate order totals before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.total = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  }
  next();
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const orderDate = new Date(this.orderDate);
  const diffTime = Math.abs(now - orderDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods to update order status
orderSchema.methods.markAsProcessing = async function(userId, notes) {
  this.status = 'processing';
  this.lastModifiedBy = userId;
  if (notes) {
    this.notes = notes;
  }
  await this.save();
};

orderSchema.methods.markAsShipped = async function(userId, trackingNumber, notes) {
  this.status = 'shipped';
  this.lastModifiedBy = userId;
  this.trackingNumber = trackingNumber;
  if (notes) {
    this.notes = notes;
  }
  await this.save();
};

orderSchema.methods.markAsDelivered = async function(userId, notes) {
  this.status = 'delivered';
  this.lastModifiedBy = userId;
  this.actualDeliveryDate = new Date();
  if (notes) {
    this.notes = notes;
  }
  await this.save();
};

orderSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.lastModifiedBy = userId;
  this.notes = reason || this.notes;
  await this.save();
};

// Create a model from the schema
const Order = mongoose.model('Order', orderSchema);

export default Order;