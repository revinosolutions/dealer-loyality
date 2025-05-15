import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    trim: true,
    unique: true
  },
  category: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  loyaltyPoints: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 5,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  maxOrderQuantity: {
    type: Number,
    default: null
  },
  images: [String],
  specifications: [{
    name: String,
    value: String
  }],
  deals: [{
    name: String,
    description: String,
    quantity: Number,
    discountPercentage: Number,
    bonusLoyaltyPoints: Number,
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isClientUploaded: {
    type: Boolean,
    default: false
  },
  clientInventory: {
    initialStock: {
      type: Number,
      default: 0
    },
    currentStock: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 5
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
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
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if a product has enough stock
productSchema.methods.hasStock = function(quantity) {
  return this.stock >= quantity;
};

// Method to calculate loyalty points for a specific quantity
productSchema.methods.calculateLoyaltyPoints = function(quantity, dealId = null) {
  let points = this.loyaltyPoints * quantity;
  
  // Apply additional points if a valid deal is selected
  if (dealId) {
    const deal = this.deals.id(dealId);
    if (deal && deal.isActive && quantity >= deal.quantity) {
      points += deal.bonusLoyaltyPoints;
    }
  }
  
  return points;
};

// Static method to create default products for demo purposes
productSchema.statics.createDefaultProducts = async function(organizationId, adminId) {
  try {
    console.log('Creating default products...');
    
    const products = [
      {
        name: 'BMW 3 Series Slot',
        description: 'Allocation slot for BMW 3 Series vehicles',
        sku: 'BMW-3SERIES-001',
        category: 'Luxury Cars',
        price: 45000,
        loyaltyPoints: 700,
        stock: 10,
        minOrderQuantity: 1,
        specifications: [
          { name: 'Model', value: '3 Series' },
          { name: 'Year', value: '2023' }
        ],
        deals: [
          {
            name: 'Bulk Deal - 3 Series',
            description: 'Purchase 5 or more 3 Series slots for bonus points',
            quantity: 5,
            discountPercentage: 2,
            bonusLoyaltyPoints: 1500,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isActive: true
          }
        ],
        organizationId,
        createdBy: adminId
      },
      {
        name: 'BMW 5 Series Slot',
        description: 'Allocation slot for BMW 5 Series vehicles',
        sku: 'BMW-5SERIES-001',
        category: 'Luxury Cars',
        price: 65000,
        loyaltyPoints: 950,
        stock: 8,
        minOrderQuantity: 1,
        specifications: [
          { name: 'Model', value: '5 Series' },
          { name: 'Year', value: '2023' }
        ],
        deals: [
          {
            name: 'Bulk Deal - 5 Series',
            description: 'Purchase 3 or more 5 Series slots for bonus points',
            quantity: 3,
            discountPercentage: 3,
            bonusLoyaltyPoints: 1200,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isActive: true
          }
        ],
        organizationId,
        createdBy: adminId
      },
      {
        name: 'BMW X5 SUV Slot',
        description: 'Allocation slot for BMW X5 SUV vehicles',
        sku: 'BMW-X5-001',
        category: 'Luxury SUVs',
        price: 75000,
        loyaltyPoints: 1100,
        stock: 5,
        minOrderQuantity: 1,
        specifications: [
          { name: 'Model', value: 'X5' },
          { name: 'Year', value: '2023' }
        ],
        deals: [
          {
            name: 'Premium SUV Deal',
            description: 'Purchase 2 or more X5 SUV slots for bonus points',
            quantity: 2,
            discountPercentage: 1.5,
            bonusLoyaltyPoints: 900,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isActive: true
          }
        ],
        organizationId,
        createdBy: adminId
      }
    ];
    
    await this.insertMany(products);
    console.log('Default products created successfully');
  } catch (error) {
    console.error('Error creating default products:', error);
    throw error;
  }
};

const Product = mongoose.model('Product', productSchema);

export default Product;