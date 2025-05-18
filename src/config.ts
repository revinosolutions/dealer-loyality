// Configuration settings for the application
const config = {
  // API base URL - different for development and production
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:5000/api',
};

export default config;

// Export API base URL for services that require it
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

// Other configuration constants can be added here as needed
export const DEFAULT_PAGINATION_LIMIT = 10;
export const MAX_PAGINATION_LIMIT = 100;