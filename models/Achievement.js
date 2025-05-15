import mongoose from 'mongoose';

// Achievement schema
const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'trophy'
  },
  badgeUrl: {
    type: String
  },
  type: {
    type: String,
    enum: ['sales', 'activity', 'engagement', 'milestone', 'other'],
    required: true
  },
  criteria: {
    metricType: {
      type: String,
      enum: ['sales_amount', 'sales_count', 'login_count', 'days_active', 'points_earned', 'orders_placed', 'custom'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 1
    },
    timeframe: {
      type: String,
      enum: ['all_time', 'yearly', 'monthly', 'weekly', 'daily', 'one_time'],
      default: 'all_time'
    },
    customLogic: String,
    productCategory: String,
    region: String
  },
  reward: {
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    bonusMultiplier: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  category: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert', 'special'],
    default: 'beginner'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
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
achievementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// User achievement tracking schema
const userAchievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  earnedDate: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update the lastUpdated field on save
userAchievementSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Create indexes for faster queries
achievementSchema.index({ type: 1, category: 1 });
achievementSchema.index({ isActive: 1 });
achievementSchema.index({ displayOrder: 1 });

userAchievementSchema.index({ userId: 1 });
userAchievementSchema.index({ achievementId: 1 });
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, isCompleted: 1 });

// Create models
const Achievement = mongoose.model('Achievement', achievementSchema);
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

export { Achievement, UserAchievement };
export default { Achievement, UserAchievement };