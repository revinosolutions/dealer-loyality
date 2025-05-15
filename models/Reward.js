import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  pointsCost: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['product', 'discount', 'cashback', 'experience', 'other'],
    default: 'product'
  },
  value: {
    type: Number,
    min: 0
  },
  availability: {
    available: {
      type: Boolean,
      default: true
    },
    startDate: Date,
    endDate: Date,
    stock: Number,
    maxRedemptionsPerUser: Number
  },
  requirements: {
    minPoints: {
      type: Number,
      default: 0
    },
    userRoles: {
      type: [String],
      enum: ['dealer', 'client']
    },
    clientSpecific: {
      type: Boolean,
      default: false
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  redemptionCount: {
    type: Number,
    default: 0
  },
  redemptionInstructions: String,
  termsAndConditions: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
rewardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if reward is available
rewardSchema.methods.isAvailable = function() {
  const now = new Date();
  
  // Check basic availability flag
  if (!this.availability.available) {
    return false;
  }
  
  // Check date range if specified
  if (this.availability.startDate && this.availability.startDate > now) {
    return false;
  }
  
  if (this.availability.endDate && this.availability.endDate < now) {
    return false;
  }
  
  // Check stock if specified
  if (this.availability.stock !== undefined && this.availability.stock <= 0) {
    return false;
  }
  
  return true;
};

// User reward redemption model
const redemptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  pointsCost: {
    type: Number,
    required: true
  },
  redemptionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled', 'delivered', 'expired'],
    default: 'pending'
  },
  deliveryDetails: {
    address: String,
    trackingNumber: String,
    estimatedDeliveryDate: Date,
    deliveryDate: Date
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
redemptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for faster queries
redemptionSchema.index({ userId: 1 });
redemptionSchema.index({ rewardId: 1 });
redemptionSchema.index({ status: 1 });
redemptionSchema.index({ redemptionDate: 1 });

// Create models
const Reward = mongoose.model('Reward', rewardSchema);
const Redemption = mongoose.model('Redemption', redemptionSchema);

export { Reward, Redemption };
export default Reward;