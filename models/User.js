import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'client', 'dealer'],
    default: 'dealer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: function() {
      // Organization is required for all roles except superadmin
      return this.role !== 'superadmin';
    }
  },
  createdBySuperAdmin: {
    type: Boolean,
    default: false
  },
  createdByAdmin: {
    type: Boolean,
    default: false
  },
  createdByClient: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: '/images/avatars/default.jpg'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'dealer';
    }
  },
  company: {
    name: String,
    position: String,
    website: String,
    address: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  points: {
    type: Number,
    default: 0
  },
  pointsHistory: [
    {
      amount: Number,
      type: {
        type: String,
        enum: ['earned', 'redeemed', 'expired', 'adjusted'],
        required: true
      },
      source: {
        type: String,
        enum: ['contest', 'sale', 'reward', 'admin', 'referral'],
        required: true
      },
      sourceId: mongoose.Schema.Types.ObjectId,
      description: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  stats: {
    totalSales: {
      type: Number,
      default: 0
    },
    contestsWon: {
      type: Number,
      default: 0
    },
    contestsParticipated: {
      type: Number,
      default: 0
    },
    rewardsRedeemed: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  notificationPreferences: {
    app: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    whatsapp: {
      type: Boolean,
      default: false
    }
  },
  isPermanentSuperadmin: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  deviceTokens: [String],
  lastLogin: Date,
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Protect permanent superadmin account from modifications
userSchema.pre('save', function(next) {
  // If this is the superadmin@revino.com account
  if (this.email === 'superadmin@revino.com') {
    // Check if this is a new document (not yet saved)
    if (this.isNew) {
      // If creating a new superadmin, mark it as permanent
      this.isPermanentSuperadmin = true;
      this.role = 'superadmin';
      this.status = 'active';
      return next();
    }
    
    // If this is an existing document, prevent changes to role, email, or status
    if (this.isModified('role') && this.role !== 'superadmin') {
      console.log('Prevented change of permanent superadmin role');
      this.role = 'superadmin';
    }
    
    if (this.isModified('email') && this.email !== 'superadmin@revino.com') {
      console.log('Prevented change of permanent superadmin email');
      this.email = 'superadmin@revino.com';
    }
    
    if (this.isModified('status') && this.status !== 'active') {
      console.log('Prevented change of permanent superadmin status');
      this.status = 'active';
    }

    // Mark as permanent superadmin if not already
    if (!this.isPermanentSuperadmin) {
      this.isPermanentSuperadmin = true;
    }
  }
  
  next();
});

// Hash the password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  
  // Only hash the password if it's modified (or new)
  if (!user.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);
    
    // Replace the password with the hash
    user.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

// Prevent deletion of permanent superadmin
userSchema.pre('deleteOne', { document: true, query: true }, function(next) {
  // If this is a document middleware
  if (this.email === 'superadmin@revino.com' || this.isPermanentSuperadmin) {
    console.log('Prevented deletion of permanent superadmin user');
    return next(new Error('Cannot delete the permanent superadmin user'));
  }
  
  // If this is a query middleware
  if (this.getFilter && (
    this.getFilter().email === 'superadmin@revino.com' || 
    this.getFilter().isPermanentSuperadmin === true)) {
    console.log('Prevented deletion of permanent superadmin user');
    return next(new Error('Cannot delete the permanent superadmin user'));
  }
  
  next();
});

// Prevent deletion of permanent superadmin via deleteMany
userSchema.pre('deleteMany', function(next) {
  if (this.getFilter) {
    const filter = this.getFilter();
    
    // If trying to delete all users
    if (Object.keys(filter).length === 0) {
      // Modify the query to exclude the permanent superadmin
      this.setQuery({ ...this.getQuery(), email: { $ne: 'superadmin@revino.com' } });
      console.log('Modified deleteMany query to protect permanent superadmin');
      return next();
    }
    
    // If specifically targeting superadmin or permanent superadmin
    if (filter.email === 'superadmin@revino.com' || 
        filter.isPermanentSuperadmin === true ||
        (filter.role === 'superadmin' && !filter.email)) {
      console.log('Prevented deletion of permanent superadmin user');
      return next(new Error('Cannot delete the permanent superadmin user'));
    }
  }
  
  next();
});

// Prevent updates that would change superadmin critical fields
userSchema.pre('findOneAndUpdate', function(next) {
  if (this.getFilter) {
    const filter = this.getFilter();
    const update = this.getUpdate();
    
    // If targeting the permanent superadmin
    if (filter.email === 'superadmin@revino.com' || filter.isPermanentSuperadmin === true) {
      // Check if update is trying to change critical fields
      if (update.$set) {
        if (update.$set.role && update.$set.role !== 'superadmin') {
          console.log('Prevented role change of permanent superadmin');
          update.$set.role = 'superadmin';
        }
        
        if (update.$set.email && update.$set.email !== 'superadmin@revino.com') {
          console.log('Prevented email change of permanent superadmin');
          update.$set.email = 'superadmin@revino.com';
        }
        
        if (update.$set.status && update.$set.status !== 'active') {
          console.log('Prevented status change of permanent superadmin');
          update.$set.status = 'active';
        }
        
        if (update.$set.isPermanentSuperadmin === false) {
          console.log('Prevented isPermanentSuperadmin change of permanent superadmin');
          update.$set.isPermanentSuperadmin = true;
        }
      }
      
      // Direct field updates
      if (update.role && update.role !== 'superadmin') {
        update.role = 'superadmin';
      }
      
      if (update.email && update.email !== 'superadmin@revino.com') {
        update.email = 'superadmin@revino.com';
      }
      
      if (update.status && update.status !== 'active') {
        update.status = 'active';
      }
      
      if (update.isPermanentSuperadmin === false) {
        update.isPermanentSuperadmin = true;
      }
    }
  }
  
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to update user's last active timestamp
userSchema.methods.updateActivity = async function() {
  try {
    this.stats.lastActive = Date.now();
    this.markModified('stats');
    // Use findByIdAndUpdate instead of save to avoid race conditions
    await mongoose.model('User').findByIdAndUpdate(this._id, { 
      'stats.lastActive': Date.now() 
    }, { new: true });
    return true;
  } catch (error) {
    // Don't throw error, just log it and continue
    console.error('Error updating user activity:', error);
    return false;
  }
};

// Static method to create default users
userSchema.statics.createDefaultUsers = async function(organizationId) {
  try {
    console.log('Creating default superadmin user...');
    
    // Check if superadmin already exists
    const existingSuperadmin = await this.findOne({ email: 'superadmin@revino.com' });
    if (existingSuperadmin) {
      console.log('Superadmin already exists, skipping creation');
      return existingSuperadmin;
    }
    
    // Create super admin user (not associated with any organization)
    const superadmin = new this({
      name: 'Super Admin',
      email: 'superadmin@revino.com',
      password: 'password123',
      role: 'superadmin',
      isPermanentSuperadmin: true,
      phone: '+1234567000',
      avatar: '/images/avatars/superadmin.jpg',
      company: {
        name: 'Revino Global',
        position: 'Super Administrator'
      },
      stats: {
        totalSales: 0,
        contestsWon: 0,
        contestsParticipated: 0,
        rewardsRedeemed: 0,
        lastActive: new Date()
      }
    });
    
    await superadmin.save();
    console.log('Created superadmin user');
    
    // Return the superadmin user for reference in other initialization methods
    return superadmin;
  } catch (error) {
    console.error('Error creating default users:', error);
    throw error;
  }
};

// Create a model from the schema
const User = mongoose.model('User', userSchema);

export default User;