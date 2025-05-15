import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
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
    },
    category: String
  }],
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  region: String,
  location: {
    city: String,
    state: String,
    country: String
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest'
  },
  isContestEligible: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'returned', 'partial_return'],
    default: 'completed'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
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
salesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for faster queries
salesSchema.index({ dealerId: 1, date: -1 });
salesSchema.index({ clientId: 1, date: -1 });
salesSchema.index({ 'products.productId': 1 });
salesSchema.index({ contestId: 1 });

// Static method to get sales by dealer
salesSchema.statics.getByDealer = async function(dealerId, options = {}) {
  const query = { dealerId };
  
  if (options.startDate && options.endDate) {
    query.date = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ date: -1 })
    .populate('orderId', 'orderNumber')
    .populate('products.productId', 'name category')
    .exec();
};

// Static method to get sales by client
salesSchema.statics.getByClient = async function(clientId, options = {}) {
  const query = { clientId };
  
  if (options.startDate && options.endDate) {
    query.date = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ date: -1 })
    .populate('dealerId', 'name email')
    .populate('orderId', 'orderNumber')
    .exec();
};

// Static method to get sales by contest
salesSchema.statics.getByContest = async function(contestId) {
  return this.find({ contestId, isContestEligible: true })
    .sort({ date: -1 })
    .populate('dealerId', 'name email')
    .populate('products.productId', 'name category')
    .exec();
};

// Static method to get sales metrics
salesSchema.statics.getMetrics = async function(options = {}) {
  const query = {};
  
  if (options.dealerId) {
    query.dealerId = options.dealerId;
  }
  
  if (options.clientId) {
    query.clientId = options.clientId;
  }
  
  if (options.startDate && options.endDate) {
    query.date = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  // Only include completed sales
  query.status = 'completed';
  
  // Aggregation for sales metrics
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        count: { $sum: 1 },
        avgSale: { $avg: '$amount' },
        productsSold: { $sum: { $size: '$products' } }
      }
    }
  ]);
};

// Create a model from the schema
const Sales = mongoose.model('Sales', salesSchema);

export default Sales;