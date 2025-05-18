import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB configuration
const mongodbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty';

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  },

  // MongoDB configuration
  mongodb: {
    uri: mongodbURI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dealer-loyalty-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dealer-loyalty-refresh-secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '1h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d'
  },

  // Platform configuration
  platform: {
    name: 'Dealer Loyalty Platform',
    version: '1.0.0',
    supportEmail: 'support@dealer-loyalty.com'
  },

  // File upload configuration
  uploads: {
    avatarDir: process.env.AVATAR_UPLOAD_DIR || 'uploads/avatars',
    productImageDir: process.env.PRODUCT_UPLOAD_DIR || 'uploads/products',
    maxFileSize: 5 * 1024 * 1024 // 5MB
  },

  // Points configuration
  points: {
    expiryDays: 365, // Points expire after 1 year
    salesMultiplier: 0.01, // 1 point per $100 of sales
    defaultRewardPointCost: 100 // Default points cost for rewards
  },

  // CORS configuration
  corsOptions: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || 'https://yourproductiondomain.com']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  },

  // API Endpoints
  apiEndpoints: {
    auth: '/api/auth',
    contests: '/api/contests',
    sales: '/api/sales',
    stats: '/api/stats',
    rewards: '/api/rewards',
    notifications: '/api/notifications',
    achievements: '/api/achievements',
    whatsapp: '/api/whatsapp',
    insights: '/api/insights',
    clients: '/api/clients',
    products: '/api/products',
    inventory: '/api/inventory',
    orders: '/api/orders',
  },
};

export default config;





