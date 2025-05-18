// API service for centralized API calls

import axios, { AxiosError } from 'axios';
import config from '../config';

// API configuration
const API_BASE_URL = config.apiBaseUrl || '/api';

// Debug response type that includes error information
export interface ErrorResponse {
  error: boolean;
  message: string;
  status?: number;
  details?: any;
  requests?: any[];
}

// Log the API base URL for debugging
console.log('API BASE URL:', API_BASE_URL);

// Flag to enable mock mode (for development when backend is not available)
const USE_MOCK = false;

// Create axios instance with default config
const api = axios.create({
  // Ensure we don't duplicate /api in the URL
  baseURL: API_BASE_URL.replace(/\/api$/, ''), // Remove trailing /api if present
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for JWT refresh token
  // Add timeout to prevent hanging requests
  timeout: 30000,
});

// Log the final baseURL for debugging
console.log('Final baseURL:', api.defaults.baseURL);

// Log the API instance configuration
console.log('API instance configured with:', {
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Some APIs expect 'Bearer' prefix while others don't, add both for compatibility
      config.headers['x-auth-token'] = token;
      console.log('Using auth token:', token.substring(0, 15) + '...');

      // Log all request headers for debugging
      console.log('Request headers:', config.headers);
    } else {
      console.warn('No authentication token found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    // Don't redirect if already on login page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      console.warn('Authentication error detected. Token may be invalid.');
      
      // Check if we already tried to refresh and got another 401
      if (error.config?._isRetry) {
        console.error('Token refresh failed, clearing auth and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!sessionStorage.getItem('auth_redirect')) {
          sessionStorage.setItem('auth_redirect', 'true');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(`/api/auth/refresh-token`, {}, {
          withCredentials: true
        });
        
        if (refreshResponse.data.token) {
          // Save new token
          localStorage.setItem('token', refreshResponse.data.token);
          
          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          error.config._isRetry = true; // Mark that we're retrying to prevent loops
          return axios(error.config);
        }
      } catch (refreshError) {
        // Refresh token failed, clear auth and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Use sessionStorage to prevent redirect loops
        if (!sessionStorage.getItem('auth_redirect')) {
          sessionStorage.setItem('auth_redirect', 'true');
          console.warn('Session expired, redirecting to login page');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Generic mock request handler
const handleMockRequest = (
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', 
  data?: any, 
  params?: any
) => {
  console.log(`Mock API Request: ${method} ${endpoint}`, { data, params });
  
  // Small delay to simulate network request
  return new Promise(resolve => {
    setTimeout(() => {
      // Extract collection and id from endpoint
      const parts = endpoint.split('/').filter((part: string) => part);
      const collection = parts[0];
      const id = parts.length > 1 ? parts[1] : null;
      const action = parts.length > 2 ? parts[2] : null;
      
      // Handle different endpoints
      switch (collection) {
        case 'products':
          if (method === 'GET' && !id) {
            resolve(MOCK_DATA.products);
          } else if (method === 'GET' && id) {
            const product = MOCK_DATA.products.find(p => p.id === id);
            resolve(product || { error: 'Product not found' });
          } else if (method === 'POST') {
            const newProduct = {
              id: 'prod-' + Date.now(),
              ...data,
              createdAt: new Date().toISOString()
            };
            MOCK_DATA.products.push(newProduct);
            resolve(newProduct);
          } else if (method === 'PUT' && id) {
            const index = MOCK_DATA.products.findIndex(p => p.id === id);
            if (index >= 0) {
              MOCK_DATA.products[index] = { ...MOCK_DATA.products[index], ...data };
              resolve(MOCK_DATA.products[index]);
            } else {
              resolve({ error: 'Product not found' });
            }
          } else if (method === 'DELETE' && id) {
            const index = MOCK_DATA.products.findIndex(p => p.id === id);
            if (index >= 0) {
              MOCK_DATA.products.splice(index, 1);
              resolve({ message: 'Product deleted successfully' });
            } else {
              resolve({ error: 'Product not found' });
            }
          }
          break;
          
        case 'contests':
          if (method === 'GET' && !id) {
            resolve({ 
              contests: MOCK_DATA.contests,
              pagination: {
                total: MOCK_DATA.contests.length,
                page: 1,
                limit: 10,
                pages: 1
              }
            });
          } else if (method === 'GET' && id) {
            const contest = MOCK_DATA.contests.find(c => c.id === id);
            resolve({ contest: contest || { error: 'Contest not found' } });
          } else if (method === 'POST') {
            const newContest = {
              id: 'contest-' + Date.now(),
              ...data,
              progress: 0,
              approvalStatus: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            MOCK_DATA.contests.push(newContest);
            resolve({ 
              contest: newContest,
              message: 'Contest created successfully'
            });
          } else if (method === 'PUT' && id) {
            const index = MOCK_DATA.contests.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.contests[index] = { 
                ...MOCK_DATA.contests[index], 
                ...data,
                updatedAt: new Date().toISOString()
              };
              resolve({ 
                contest: MOCK_DATA.contests[index],
                message: 'Contest updated successfully'
              });
            } else {
              resolve({ error: 'Contest not found' });
            }
          } else if (method === 'DELETE' && id) {
            const index = MOCK_DATA.contests.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.contests.splice(index, 1);
              resolve({ message: 'Contest deleted successfully' });
            } else {
              resolve({ error: 'Contest not found' });
            }
          } else if (method === 'PUT' && id && action === 'approve') {
            const index = MOCK_DATA.contests.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.contests[index].approvalStatus = 'approved';
              MOCK_DATA.contests[index].updatedAt = new Date().toISOString();
              resolve({ 
                contest: MOCK_DATA.contests[index],
                message: 'Contest approved successfully'
              });
            } else {
              resolve({ error: 'Contest not found' });
            }
          } else if (method === 'PUT' && id && action === 'reject') {
            const index = MOCK_DATA.contests.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.contests[index].approvalStatus = 'rejected';
              MOCK_DATA.contests[index].updatedAt = new Date().toISOString();
              resolve({ 
                contest: MOCK_DATA.contests[index],
                message: 'Contest rejected successfully'
              });
            } else {
              resolve({ error: 'Contest not found' });
            }
          }
          break;
          
        case 'inventory':
          if (method === 'GET' && !id) {
            resolve(MOCK_DATA.inventory);
          } else if (method === 'GET' && id) {
            const item = MOCK_DATA.inventory.find(i => i.id === id);
            resolve(item || { error: 'Inventory item not found' });
          } else if (method === 'PUT' && id) {
            const index = MOCK_DATA.inventory.findIndex(i => i.id === id);
            if (index >= 0) {
              MOCK_DATA.inventory[index] = { 
                ...MOCK_DATA.inventory[index], 
                ...data,
                lastUpdated: new Date().toISOString()
              };
              resolve(MOCK_DATA.inventory[index]);
            } else {
              resolve({ error: 'Inventory item not found' });
            }
          }
          break;
          
        case 'orders':
          if (method === 'GET' && !id) {
            resolve(MOCK_DATA.orders);
          } else if (method === 'GET' && id) {
            const order = MOCK_DATA.orders.find(o => o.id === id);
            resolve(order || { error: 'Order not found' });
          } else if (method === 'POST') {
            const newOrder = {
              id: 'order-' + Date.now(),
              ...data,
              status: 'processing',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            MOCK_DATA.orders.push(newOrder);
            resolve(newOrder);
          } else if (method === 'PUT' && id) {
            const index = MOCK_DATA.orders.findIndex(o => o.id === id);
            if (index >= 0) {
              MOCK_DATA.orders[index] = { 
                ...MOCK_DATA.orders[index], 
                ...data,
                updatedAt: new Date().toISOString()
              };
              resolve(MOCK_DATA.orders[index]);
            } else {
              resolve({ error: 'Order not found' });
            }
          }
          break;
          
        case 'clients':
          if (method === 'GET' && !id) {
            resolve(MOCK_DATA.clients);
          } else if (method === 'GET' && id) {
            const client = MOCK_DATA.clients.find(c => c.id === id);
            resolve(client || { error: 'Client not found' });
          } else if (method === 'POST') {
            const newClient = {
              id: 'client-' + Date.now(),
              ...data,
              status: 'active',
              createdAt: new Date().toISOString(),
              stats: {
                totalSales: 0,
                rewardsRedeemed: 0,
                totalDealers: 0,
                activeContests: 0,
                activeRewards: 0
              }
            };
            MOCK_DATA.clients.push(newClient);
            resolve(newClient);
          } else if (method === 'PUT' && id) {
            const index = MOCK_DATA.clients.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.clients[index] = { ...MOCK_DATA.clients[index], ...data };
              resolve(MOCK_DATA.clients[index]);
            } else {
              resolve({ error: 'Client not found' });
            }
          } else if (method === 'DELETE' && id) {
            const index = MOCK_DATA.clients.findIndex(c => c.id === id);
            if (index >= 0) {
              MOCK_DATA.clients.splice(index, 1);
              resolve({ message: 'Client deleted successfully' });
            } else {
              resolve({ error: 'Client not found' });
            }
          }
          break;
          
        default:
          resolve({ error: 'Endpoint not implemented in mock API' });
      }
    }, 300); // 300ms delay to simulate network request
  });
};

// Define an extended AxiosError type with our custom properties
interface EnhancedAxiosError extends AxiosError {
  serverError?: boolean;
  endpoint?: string;
  requestMethod?: string;
  timestamp?: string;
}

// Log the API response error
const handleApiError = (error: any, endpoint: string, method: string): any => {
  if (axios.isAxiosError(error)) {
    console.error(`API Error ${method} ${endpoint}:`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Add more context to the error
    if (error.response?.status === 500) {
      console.error('Server returned 500 error. This may indicate a backend issue.');
      
      // Enrich the error with additional information
      const enhancedError = error as EnhancedAxiosError;
      enhancedError.serverError = true;
      enhancedError.endpoint = endpoint;
      enhancedError.requestMethod = method;
      enhancedError.timestamp = new Date().toISOString();
      
      // Log full error response for debugging
      console.error('Full error response:', enhancedError);
      
      return enhancedError;
    }
  } else {
    console.error(`Non-Axios error in API request to ${endpoint}:`, error);
  }
  return error;
};

// API request function - added explicit debug logging for inventory endpoints
// API endpoints for purchase requests specifically need token check
export const apiRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any,
  params?: any,
  customTimeout?: number
): Promise<T> => {
  // Ensure endpoint starts with /api
  const normalizedEndpoint = endpoint.startsWith('/api') 
    ? endpoint 
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  console.log(`API Request: ${method} ${normalizedEndpoint}`);
  try {
    if (USE_MOCK) {
      console.log('Using mock API for:', endpoint);
      return handleMockRequest(endpoint, method, data, params) as Promise<T>;
    }
    
    // Add debug logging for inventory updates
    if (endpoint.includes('inventory') && (method === 'PATCH' || method === 'PUT')) {
      console.log('🔍 INVENTORY UPDATE REQUEST:', {
        endpoint,
        method,
        data,
        timestamp: new Date().toISOString()
      });
    }
    
    // Add debug logging for product save/update operations
    if ((method === 'POST' || method === 'PUT') && 
        (endpoint.includes('products') || endpoint.includes('admin/products'))) {
      console.log('🔍 PRODUCT SAVE/UPDATE REQUEST:', {
        endpoint,
        method,
        hasData: !!data,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fixed endpoint formatting to prevent duplicate /api/ prefixes
    let formattedEndpoint = endpoint;
    
    // First, strip any existing /api/ prefix completely
    if (formattedEndpoint.startsWith('/api/')) {
      formattedEndpoint = formattedEndpoint.substring(5); // Skip '/api/'
    } else if (formattedEndpoint.startsWith('api/')) {
      formattedEndpoint = formattedEndpoint.substring(4); // Skip 'api/'
    } else if (formattedEndpoint.startsWith('/api')) {
      formattedEndpoint = formattedEndpoint.substring(4); // Skip '/api'
    } else if (formattedEndpoint.startsWith('api')) {
      formattedEndpoint = formattedEndpoint.substring(3); // Skip 'api'
    }
    
    // Remove any leading slashes to standardize
    if (formattedEndpoint.startsWith('/')) {
      formattedEndpoint = formattedEndpoint.substring(1);
    }
    
    // Now add a single, consistent /api/ prefix
    formattedEndpoint = `/api/${formattedEndpoint}`;
    
    console.log(`Endpoint formatting: "${endpoint}" → "${formattedEndpoint}"`);
    
    // Fix any double slashes that might have been created
    formattedEndpoint = formattedEndpoint.replace(/\/+/g, '/');
    
    // Log the original and modified endpoint for debugging
    console.log(`Endpoint formatting: "${endpoint}" → "${formattedEndpoint}"`);
    
    // Add extra debug logging for admin endpoints that were having issues
    if (endpoint.includes('admin') || formattedEndpoint.includes('admin')) {
      console.log('🔍 ADMIN ENDPOINT DEBUG:', {
        original: endpoint,
        formatted: formattedEndpoint
      });
    }

  // Get auth token directly for this request
  let token = localStorage.getItem('token');
  
  // For purchase requests endpoints, retry to get token or use a recovery approach
  if (!token && (
      endpoint.includes('purchase-requests') || 
      endpoint.includes('client-purchase-requests') || 
      endpoint.includes('admin-purchase-requests')
  )) {
    console.warn('No token found for purchase request API call, trying recovery options');
    
    // Try to check for token again - sometimes there's a race condition
    let updatedToken = localStorage.getItem('token');
    
    if (updatedToken) {
      console.log('Token recovered on second attempt:', updatedToken.substring(0, 15) + '...');
      // Use the updated token
      const config: any = {
        url: formattedEndpoint,
        method,
        data,
        params,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${updatedToken}`,
          'x-auth-token': updatedToken
        },
        timeout: customTimeout || 10000
      };
      
      try {
        console.log('Request headers:', config.headers);
        const response = await api.request(config);
        console.log(`API Response from ${formattedEndpoint}:`, response.status, response.statusText);
        return response.data;
      } catch (innerError) {
        throw innerError;
      }
    } else {
      // Check if user exists in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        console.log('User found in localStorage, proceeding with request but auth may fail');
        
        // Generate a temporary token for this request (this is a fallback mechanism)
        const user = JSON.parse(storedUser);
        if (user && user.id) {
          console.log('Attempting to recover session for user:', user.id);
          
          // Try to trigger a session refresh
          try {
            const refreshResponse = await fetch('/api/auth/refresh-token', {
              method: 'POST',
              credentials: 'include'
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.token) {
                const refreshedToken = refreshData.token;
                localStorage.setItem('token', refreshedToken);
                console.log('Successfully refreshed token');
                
                // Use the refreshed token for this request
                const configWithRefreshedToken: any = {
                  url: formattedEndpoint,
                  method,
                  data,
                  params,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshedToken}`,
                    'x-auth-token': refreshedToken
                  },
                  timeout: customTimeout || 10000
                };
                
                try {
                  console.log('Request headers with refreshed token:', configWithRefreshedToken.headers);
                  const response = await api.request(configWithRefreshedToken);
                  console.log(`API Response from ${formattedEndpoint}:`, response.status, response.statusText);
                  return response.data;
                } catch (innerError) {
                  throw innerError;
                }
              }
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
          }
        }
      } else {
        console.error('No user data found in localStorage');
        throw new Error('Authentication required - No user data found');
      }
    }
    } else if (!token && !endpoint.includes('/auth/')) {
      console.error('No authentication token found', { endpoint: formattedEndpoint });
      // Try to recover auth from localStorage if possible
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          console.warn('User found in localStorage but no token available');
          // Redirect to login with a clear message
          window.location.href = '/login?sessionExpired=true';
          throw new Error('Session expired. Please login again.');
        }
      } catch (e) {
        console.error('Failed to check localStorage for user data', e);
      }
      throw new Error('Authentication required - No token found');
    }
    
    // Log more detailed information about the request
    console.log(`Making ${method} API request to ${formattedEndpoint}`, {
      hasData: !!data,
      hasParams: !!params,
      params: params,
      hasToken: !!token,
      data: method === 'POST' ? data : undefined, // Log POST data for debugging
      timeout: customTimeout || 10000
    });
    
    // Set up request config with explicit headers
    const config: any = {
      url: formattedEndpoint,
      method,
      data,
      params,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: customTimeout || 10000 // Use custom timeout if provided
    };
    
    // For product save operations, ensure we use a longer timeout
    if ((method === 'POST' || method === 'PUT') && 
        (endpoint.includes('products') || endpoint.includes('admin/products'))) {
      config.timeout = 30000; // 30 seconds for product saves
      
      // Fix any double /api/ paths that might still occur
      if (config.url.includes('/api/api/')) {
        config.url = config.url.replace('/api/api/', '/api/');
        console.log(`Fixed product save URL path: ${config.url}`);
      }
    }
    
    // Extra debugging for URL paths having issues
    if (endpoint.includes('purchase-requests')) {
      console.log('Final request URL for purchase requests:', config.url);
      console.log('Params:', params);
    }
    
    // Add special debug logging for products endpoint
    if (endpoint.includes('products') && !endpoint.includes('purchase-requests')) {
      console.log('Products API request URL:', config.url);
      console.log('Products API request params:', params);
      
      // Fix double api path issue - critical fix
      if (config.url.includes('/api/api/')) {
        const fixedUrl = config.url.replace('/api/api/', '/api/');
        console.log(`Fixed double API path: ${config.url} → ${fixedUrl}`);
        config.url = fixedUrl;
      }
      
      // Special handling for admin product requests - without custom headers that might trigger CORS
      if (params && params.adminView === true) {
        console.log('Processing admin product request with special handling');
        // No custom headers - they cause CORS issues
        // Just use longer timeout for admin requests
        config.timeout = 20000; // 20 seconds for admin product requests
      }
    }
    
    // Special handling for admin product requests
    if (endpoint.includes('admin/products')) {
      console.log('🔍 ADMIN PRODUCTS REQUEST DEBUG:', {
        endpoint,
        method,
        params,
        hasData: !!data
      });
      
      // Ensure longer timeout for admin requests
      config.timeout = 30000; // 30 seconds timeout
      
      // Fix double api path issue specifically for admin products
      if (config.url.includes('/api/api/')) {
        const fixedUrl = config.url.replace('/api/api/', '/api/');
        console.log(`Fixed double API path for admin products: ${config.url} → ${fixedUrl}`);
        config.url = fixedUrl;
      }
      
      // Skip adding the special header that might cause issues
      // config.headers['X-Admin-Request'] = 'true';
      
      // Log more context about the admin request
      console.log('Admin Products Request Headers:', config.headers);
    }
    
    // Only add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Some APIs may expect x-auth-token
      config.headers['x-auth-token'] = token;
    }
    
    try {
      // Log headers being sent
      console.log('Request headers:', config.headers);
      
      const response = await api.request(config);
      console.log(`API Response from ${formattedEndpoint}:`, response.status, response.statusText);
      
      if (method === 'GET' && endpoint.includes('product-requests')) {
        console.log('Purchase requests response data:', response.data);
      }
      
      return response.data;
    } catch (error: any) {
      // Enhanced error handling with more context
      const enhancedError = handleApiError(error, formattedEndpoint, method);
      
      // Special handling for 500 errors
      if (axios.isAxiosError(error) && error.response?.status === 500) {
        console.log('Attempting alternative approach for 500 error...');
        
        // Try with a direct fetch for GET requests as a fallback
        if (method === 'GET') {
          try {
            console.log('Attempting direct fetch fallback for 500 error...');
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token available for direct fetch');
            
            const directResponse = await fetch(formattedEndpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (directResponse.ok) {
              console.log('Direct fetch fallback successful');
              const data = await directResponse.json();
              return data;
            }
          } catch (directFetchError) {
            console.error('Direct fetch fallback also failed:', directFetchError);
          }
        }
      }
      
      console.error('API Request error:', enhancedError);
      throw enhancedError;
    }
  } catch (error: any) {
    console.error('API Request error:', error);
    throw error;
  }
};

// API endpoints for contests
export const contestsApi = {
  getAll: (params?: any) => apiRequest('/contests', 'GET', undefined, params),
  getById: (id: string) => apiRequest(`/contests/${id}`, 'GET'),
  create: (data: any) => apiRequest('/contests', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/contests/${id}`, 'PUT', data),
  delete: (id: string) => apiRequest(`/contests/${id}`, 'DELETE'),
  join: (id: string) => apiRequest(`/contests/${id}/join`, 'POST'),
  leave: (id: string) => apiRequest(`/contests/${id}/leave`, 'POST'),
  approve: (id: string) => apiRequest(`/contests/${id}/approve`, 'POST'),
  reject: (id: string, reason: string) => apiRequest(`/contests/${id}/reject`, 'POST', { reason }),
};

// API endpoints for dealers
export const dealersApi = {
  getAll: (params?: any) => apiRequest('/dealers', 'GET', undefined, params),
  getById: (id: string) => apiRequest(`/dealers/${id}`, 'GET'),
  create: (data: any) => apiRequest('/dealers', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/dealers/${id}`, 'PUT', data),
  updateStatus: (id: string, status: string) => apiRequest(`/dealers/${id}/status`, 'PATCH', { status }),
  delete: (id: string) => apiRequest(`/dealers/${id}`, 'DELETE'),
  getStats: (id: string) => apiRequest(`/dealers/${id}/stats`, 'GET'),
  getSales: (id: string, params?: any) => apiRequest(`/dealers/${id}/sales`, 'GET', undefined, params),
};

// API endpoints for sales
export const salesApi = {
  getAll: (params?: any) => apiRequest('/sales', 'GET', undefined, params),
  getById: (id: string) => apiRequest(`/sales/${id}`, 'GET'),
  create: (data: any) => apiRequest('/sales', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/sales/${id}`, 'PUT', data),
  delete: (id: string) => apiRequest(`/sales/${id}`, 'DELETE'),
  verify: (id: string) => apiRequest(`/sales/${id}/verify`, 'POST'),
  reject: (id: string, reason: string) => apiRequest(`/sales/${id}/reject`, 'POST', { reason }),
  getSalesData: (period: string) => apiRequest('/sales/stats', 'GET', undefined, { period }),
};

// API endpoints for rewards
export const rewardsApi = {
  getAll: (params?: any) => apiRequest('/rewards', 'GET', undefined, params),
  getById: (id: string) => apiRequest(`/rewards/${id}`, 'GET'),
  create: (data: any) => apiRequest('/rewards', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/rewards/${id}`, 'PUT', data),
  delete: (id: string) => apiRequest(`/rewards/${id}`, 'DELETE'),
  redeem: (id: string) => apiRequest(`/rewards/${id}/redeem`, 'POST'),
  getAvailable: () => apiRequest('/rewards/available', 'GET'),
  getRedeemed: () => apiRequest('/rewards/redeemed', 'GET'),
};

// API endpoints for stats
export const statsApi = {
  getAll: () => apiRequest('/stats', 'GET'),
  getLeaderboard: (params?: any) => apiRequest('/stats/leaderboard', 'GET', undefined, params),
  getSalesTrend: (period: string) => apiRequest('/stats/sales-trend', 'GET', undefined, { period }),
  getUserGrowth: (period: string) => apiRequest('/stats/user-growth', 'GET', undefined, { period }),
};

// API endpoints for system configuration
export const systemApi = {
  getConfig: () => apiRequest('/system/config', 'GET'),
  updateConfig: (data: any) => apiRequest('/system/config', 'PUT', data),
  getMaintenanceStatus: () => apiRequest('/system/maintenance', 'GET'),
  setMaintenanceStatus: (enabled: boolean) => apiRequest('/system/maintenance', 'PUT', { enabled }),
};

// API endpoints for notifications
export const notificationsApi = {
  getAll: (params?: any) => apiRequest('/notifications', 'GET', undefined, params),
  markAsRead: (id: string) => apiRequest(`/notifications/${id}/read`, 'POST'),
  markAllAsRead: () => apiRequest('/notifications/read-all', 'POST'),
  updatePreferences: (preferences: any) => apiRequest('/notifications/preferences', 'PUT', preferences),
};

// API endpoints for achievements
export const achievementsApi = {
  getAll: (params?: any) => apiRequest('/achievements', 'GET', undefined, params),
  getById: (id: string) => apiRequest(`/achievements/${id}`, 'GET'),
  create: (data: any) => apiRequest('/achievements', 'POST', data),
  update: (id: string, data: any) => apiRequest(`/achievements/${id}`, 'PUT', data),
  delete: (id: string) => apiRequest(`/achievements/${id}`, 'DELETE'),
  getEarned: () => apiRequest('/achievements/earned', 'GET'),
  getAvailable: () => apiRequest('/achievements/available', 'GET'),
};

// API endpoints for authentication
export const authApi = {
  login: (credentials: { email: string; password: string }) => 
    apiRequest('/auth/login', 'POST', credentials),
  register: (data: any) => apiRequest('/auth/register', 'POST', data),
  logout: () => apiRequest('/auth/logout', 'POST'),
  refreshToken: () => apiRequest('/auth/refresh', 'POST'),
  forgotPassword: (email: string) => apiRequest('/auth/forgot-password', 'POST', { email }),
  resetPassword: (token: string, password: string) => 
    apiRequest('/auth/reset-password', 'POST', { token, password }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    apiRequest('/auth/change-password', 'POST', data),
};

// User API methods
export const usersApi = {
  getAll: (params?: { role?: string; status?: string; search?: string }) => 
    apiRequest('/api/users', 'GET', null, params),
  getById: (id: string) => apiRequest(`/api/users/${id}`),
  create: (userData: any) => apiRequest('/api/users', 'POST', userData),
  update: (id: string, userData: any) => apiRequest(`/api/users/${id}`, 'PUT', userData),
  delete: (id: string) => apiRequest(`/api/users/${id}`, 'DELETE'),
  resetPassword: (id: string, newPassword?: string) => 
    apiRequest<{message: string, user: any, temporaryPassword: string}>(`/api/users/${id}/reset-password`, 'POST', { newPassword }),
};

// Empty data instead of mock data
const MOCK_DATA = {
  products: [] as any[],
  clients: [] as any[],
  orders: [] as any[],
  inventory: [] as any[],
  contests: [] as any[]
};

// API endpoints for products (added explicit implementation)
export const productsApi = {
  getAll: (params?: any) => apiRequest('/products', 'GET', undefined, params),
  getAllAdmin: (params?: any) => {
    console.log('Getting all products for admin with params:', params);
    // Force the correct path to avoid double /api/ issues
    // Always exclude client products from admin products view
    return apiRequest('/admin/products', 'GET', undefined, {
      ...params, 
      adminView: true,
      isClientUploaded: false // Explicitly exclude client products
    });
  },
  getById: (id: string) => apiRequest(`/products/${id}`, 'GET'),
  getByIdAdmin: (id: string) => apiRequest(`/admin/products/${id}`, 'GET'),
  create: (data: any) => {
    console.log('Creating product with data:', data);
    // Ensure we're using the correct endpoint
    return apiRequest('/admin/products', 'POST', data);
  },
  update: (id: string, data: any) => {
    console.log('Updating product with ID:', id, 'and data:', data);
    // Ensure we're using the correct endpoint
    return apiRequest(`/admin/products/${id}`, 'PUT', data);
  },
  delete: (id: string) => apiRequest(`/admin/products/${id}`, 'DELETE'),
  updateStatus: (id: string, status: string) => 
    apiRequest(`/admin/products/${id}/status`, 'PUT', { status }),
};

export const updateSuperAdminProfile = async (data: any) => {
  console.log('Updating SuperAdmin profile with data:', data);
  
  // Return actual API call
  try {
    const response = await axios.put('/api/superadmin/profile', data);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export default api;