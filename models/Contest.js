import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sales', 'achievement', 'activity', 'custom'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  goal: {
    type: Number,
    required: true
  },
  reward: {
    type: {
      type: String,
      enum: ['points', 'prize', 'badge'],
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: String,
    imageUrl: String
  },
  eligibility: {
    roles: {
      type: [String],
      enum: ['dealer', 'client'],
      default: ['dealer']
    },
    clientSpecific: {
      type: Boolean,
      default: false
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    regions: [String],
    minSales: Number,
    minRegistrationDays: Number,
    customCriteria: mongoose.Schema.Types.Mixed
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  winners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rules: {
    salesProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    targetAchievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }],
    minimumOrders: Number,
    minimumOrderValue: Number,
    activityType: String,
    requiredCount: Number,
    pointMultiplier: Number,
    customRules: mongoose.Schema.Types.Mixed
  },
  progressTracking: {
    realTime: {
      type: Boolean,
      default: true
    },
    updateFrequency: String,
    leaderboard: {
      type: Boolean,
      default: true
    },
    publicResults: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cancellationReason: String,
  completedAt: Date,
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
contestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate that start date is before end date
contestSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Method to check if a contest is active
contestSchema.methods.isActive = function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.startDate <= now &&
    this.endDate >= now
  );
};

// Create a model from the schema
const Contest = mongoose.model('Contest', contestSchema);

export default Contest;