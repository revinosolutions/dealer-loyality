// API service for centralized API calls

import axios from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';  // Base URL without /api suffix

// Debug response type that includes error information
export interface ErrorResponse {
  error: boolean;
  message: string;
  status?: number;
  details?: any;
  requests?: any[];
}

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE_URL);

// Flag to enable mock mode (for development when backend is not available)
const USE_MOCK = false;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for JWT refresh token
  // Add timeout to prevent hanging requests
  timeout: 30000,
});

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
      
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, {
          withCredentials: true
        });
        
        if (refreshResponse.data.token) {
          // Save new token
          localStorage.setItem('token', refreshResponse.data.token);
          
          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          return axios(error.config);
        }
      } catch (refreshError) {
        // Refresh token failed, clear auth and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (!window.sessionStorage.getItem('auth_error_shown')) {
          window.sessionStorage.setItem('auth_error_shown', 'true');
          alert('Your session has expired. Please log in again.');
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
          } else if (method === 'POST' && id && action === 'approve') {
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
          } else if (method === 'POST' && id && action === 'reject') {
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

// Generic API request function
export const apiRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any,
  params?: any,
  customTimeout?: number
): Promise<T> => {
  try {
    if (USE_MOCK) {
      console.log('Using mock API for:', endpoint);
      return handleMockRequest(endpoint, method, data, params) as Promise<T>;
    }
    
    // Completely new approach to ensure proper endpoint formatting
    let formattedEndpoint = endpoint;
    
    // Remove any leading slashes and 'api/' prefix
    if (formattedEndpoint.startsWith('/')) {
      formattedEndpoint = formattedEndpoint.substring(1);
    }
    
    if (formattedEndpoint.startsWith('api/')) {
      formattedEndpoint = formattedEndpoint.substring(4);
    }
    
    // Now add a single /api/ prefix
    formattedEndpoint = `/api/${formattedEndpoint}`;
    
    // Fix any double slashes that might have been created
    formattedEndpoint = formattedEndpoint.replace(/\/+/g, '/');
    
    // Make sure it starts with /api/
    if (!formattedEndpoint.startsWith('/api/')) {
      formattedEndpoint = `/api${formattedEndpoint}`;
    }
    
    // Log the original and modified endpoint
    console.log(`Endpoint formatting: "${endpoint}" → "${formattedEndpoint}"`);
    
    // Get auth token directly for this request
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found', { endpoint: formattedEndpoint });
      
      // For non-auth endpoints, continue without token
      if (!endpoint.includes('/auth/')) {
        throw new Error('Authentication required - No token found');
      }
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
      console.error(`API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      console.error('Full error response:', error.response?.data);
      
      // Enhanced error logging for product requests
      if (endpoint.includes('product-requests')) {
        console.error('Product request error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config
        });
        
        // For debug endpoint, don't throw the error but return an error object instead
        if (endpoint.includes('debug-admin') && error.response?.status === 500) {
          console.warn('Recovering from 500 error in debug endpoint and returning error object instead');
          return {
            error: true,
            message: error.response?.data?.message || 'Internal server error',
            status: error.response?.status,
            details: error.response?.data || {},
            requests: []
          } as unknown as T;
        }
      }
      
      // Handle token validation issues
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.error('Authentication error. Token may be invalid or expired.');
        
        if (error.response.data?.message?.includes('User not found') || 
            error.response.data?.message?.includes('Token is valid, but user no longer exists')) {
          console.log('Consider logging out and logging in again to refresh the token');
        }
      }
      
      throw error;
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
  products: [],
  clients: [],
  orders: [],
  inventory: []
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