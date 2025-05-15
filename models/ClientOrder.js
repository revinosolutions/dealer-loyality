import mongoose from 'mongoose';

const clientOrderSchema = new mongoose.Schema({
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
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
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
    loyaltyPoints: {
      type: Number,
      required: true,
      min: 0
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId
    },
    allocatedQuantity: {
      type: Number,
      default: 0
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
  totalLoyaltyPoints: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'approved', 'processing', 'completed', 'cancelled'],
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
  notes: String,
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
clientOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add status to history when status changes
clientOrderSchema.pre('save', function(next) {
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
clientOrderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.total = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
    this.totalLoyaltyPoints = this.items.reduce((sum, item) => sum + (item.loyaltyPoints * item.quantity), 0);
  }
  next();
});

// Generate order number
clientOrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    this.orderNumber = `CO-${timestamp}-${random}`;
  }
  next();
});

// Create a model from the schema
const ClientOrder = mongoose.model('ClientOrder', clientOrderSchema);

export default ClientOrder; 