import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  settings: {
    theme: {
      primaryColor: {
        type: String,
        default: '#2563eb' // Default blue color
      },
      secondaryColor: {
        type: String,
        default: '#1e40af'
      },
      logoUrl: String
    },
    features: {
      rewards: {
        type: Boolean,
        default: true
      },
      sales: {
        type: Boolean,
        default: true
      },
      orders: {
        type: Boolean,
        default: true
      },
      contests: {
        type: Boolean,
        default: true
      }
    },
    // Organization-specific settings
    customization: {
      dealerLabel: {
        type: String,
        default: 'Dealer'
      },
      clientLabel: {
        type: String,
        default: 'Client'
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  contactInfo: {
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    website: String
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
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization; 