import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
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
  goal: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  reward: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'upcoming', 'completed'],
    default: 'upcoming'
  },
  clientId: {
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

contestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Contest = mongoose.model('Contest', contestSchema);

export default Contest;