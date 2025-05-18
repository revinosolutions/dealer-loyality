import mongoose from 'mongoose';

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
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  price: { 
    type: Number, 
    required: true 
  },
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

// Pre-save middleware to ensure updated timestamps
purchaseRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total price
purchaseRequestSchema.virtual('totalPrice').get(function() {
  return this.price * this.quantity;
});

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

export default PurchaseRequest; 