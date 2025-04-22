export default {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dealer-loyalty',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '24h',

  // CORS configuration
  corsOptions: {
    origin: process.env.FRONTEND_URL,
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
  },
};





