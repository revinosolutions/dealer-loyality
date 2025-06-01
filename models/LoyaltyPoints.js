import mongoose from 'mongoose';

const loyaltyPointsSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  points: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalEarnedPoints: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalRedeemedPoints: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  transactions: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired', 'adjusted'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    referenceType: {
      type: String,
      enum: ['purchase_request', 'order', 'redemption', 'adjustment'],
      required: false
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    metadata: {
      type: Object,
      default: {}
    }
  }],
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
loyaltyPointsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add points and record transaction
loyaltyPointsSchema.methods.addPoints = async function(pointsToAdd, transactionData) {
  if (pointsToAdd <= 0) {
    throw new Error('Points to add must be a positive number');
  }

  // Add to current points balance
  this.points += pointsToAdd;
  this.totalEarnedPoints += pointsToAdd;
  
  // Record the transaction
  this.transactions.push({
    date: new Date(),
    type: 'earned',
    points: pointsToAdd,
    ...transactionData
  });

  // Save the updated document
  return this.save();
};

// Redeem points and record transaction
loyaltyPointsSchema.methods.redeemPoints = async function(pointsToRedeem, transactionData) {
  if (pointsToRedeem <= 0) {
    throw new Error('Points to redeem must be a positive number');
  }

  if (this.points < pointsToRedeem) {
    throw new Error('Insufficient points balance');
  }

  // Subtract from current points balance
  this.points -= pointsToRedeem;
  this.totalRedeemedPoints += pointsToRedeem;
  
  // Record the transaction
  this.transactions.push({
    date: new Date(),
    type: 'redeemed',
    points: pointsToRedeem,
    ...transactionData
  });

  // Save the updated document
  return this.save();
};

// Static method to find or create loyalty points for a client
loyaltyPointsSchema.statics.findOrCreate = async function(clientId) {
  let loyaltyPoints = await this.findOne({ clientId });
  
  if (!loyaltyPoints) {
    loyaltyPoints = new this({
      clientId,
      points: 0,
      totalEarnedPoints: 0,
      totalRedeemedPoints: 0,
      transactions: []
    });
    await loyaltyPoints.save();
  }
  
  return loyaltyPoints;
};

// Static method to get transaction history for a client
loyaltyPointsSchema.statics.getTransactionHistory = async function(clientId, limit = 50) {
  const loyaltyPoints = await this.findOne({ clientId });
  
  if (!loyaltyPoints) {
    return [];
  }
  
  // Sort transactions by date in descending order and apply limit
  return loyaltyPoints.transactions
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
};

const LoyaltyPoints = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);

export default LoyaltyPoints; 