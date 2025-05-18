import axios from 'axios';

// API base URL - use relative URL to work with Vite proxy
const API_URL = '/api';

// Flag to enable mock mode (set to false to use real backend)
const USE_MOCK = false; // Using real backend now

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'client' | 'dealer';
  points: number;
  avatar: string;
  phone?: string;
  clientId?: string;
  company?: {
    name: string;
    position: string;
  };
  notificationPreferences?: {
    app: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  stats?: {
    totalSales: number;
    contestsWon: number;
    contestsParticipated: number;
    rewardsRedeemed: number;
    lastActive: string;
  };
  status?: string;
  organization?: {
    id: string;
    name: string;
    settings?: {
      theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        logoUrl?: string;
      };
      features?: {
        rewards?: boolean;
        sales?: boolean;
        orders?: boolean;
        contests?: boolean;
      };
      customization?: {
        dealerLabel?: string;
        clientLabel?: string;
      };
    };
  };
  createdBySuperAdmin?: boolean;
  createdByAdmin?: boolean;
  createdByClient?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'superadmin' | 'admin' | 'client' | 'dealer';
  clientId?: string;
  phone?: string;
  company?: string;
  location?: string;
  status?: string;
  createdBySuperAdmin?: boolean;
  createdByAdmin?: boolean;
  createdByClient?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  avatar?: string;
  notificationPreferences?: {
    app?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
}

// Mock data for development
const MOCK_USERS: User[] = [
  // Only keeping superadmin for testing purposes
  {
    id: 'superadmin-id-123',
    name: 'Super Admin',
    email: 'superadmin@revino.com',
    role: 'superadmin',
    points: 10000,
    avatar: '/images/avatars/superadmin.jpg',
    phone: '+1234567000',
    status: 'active',
    company: {
      name: 'Revino Global',
      position: 'Super Administrator'
    },
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: true
    },
    stats: {
      totalSales: 0,
      contestsWon: 0,
      contestsParticipated: 0,
      rewardsRedeemed: 0,
      lastActive: new Date().toISOString()
    }
  }
  // Removed all other mock users
];

// Axios instance with auth header
const authAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true // Enable cookies for JWT refresh token
});

// Add token to requests if available
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh the token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
          withCredentials: true // Include cookies
        });
        
        const newToken = refreshResponse.data.token;
        
        // Save new token
        localStorage.setItem('token', newToken);
        
        // Update axios headers
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        
        // Retry the original request
        return authAxios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout
        console.error('Token refresh failed:', refreshError);
        
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// MOCK IMPLEMENTATIONS (only used if USE_MOCK is true)
const mockLogin = async (data: LoginData): Promise<LoginResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  console.log('Mock login attempt for email:', data.email);
  
  let user = MOCK_USERS.find(u => u.email === data.email);
  
  // Special case for superadmin access
  if (data.email === 'superadmin@revino.com' || data.email.includes('super')) {
    console.log('Using superadmin credentials');
    user = MOCK_USERS[0]; // Use the superadmin user
  } else if (data.email === 'admin@revino.com' || data.email.includes('admin')) {
    console.log('Using admin credentials');
    user = MOCK_USERS[1]; // Use the admin user
  } else if (data.email === 'client@example.com' || data.email.includes('client')) {
    console.log('Using client credentials');
    user = MOCK_USERS[2]; // Use the client user
  } else {
    console.log('Using dealer credentials');
    user = MOCK_USERS[3]; // Default to dealer user
  }
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Create mock token
  const token = `mock_token_${Date.now()}_${user.role}`;
  
  // Store in localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  return { token, user };
};

const mockRegister = async (data: RegisterData): Promise<LoginResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  // Create new user
  const newUser: User = {
    id: `user-id-${Date.now()}`,
    name: data.name,
    email: data.email,
    role: data.role || 'dealer',
    points: 0,
    avatar: '/images/avatars/default.jpg',
    phone: data.phone,
    clientId: data.clientId,
    status: 'active',
    company: {
      name: 'New Company',
      position: 'Member'
    },
    notificationPreferences: {
      app: true,
      email: true,
      whatsapp: false
    },
    stats: {
      totalSales: 0,
      contestsWon: 0,
      contestsParticipated: 0,
      rewardsRedeemed: 0,
      lastActive: new Date().toISOString()
    }
  };
  
  // Create mock token
  const token = `mock_token_${Date.now()}_${newUser.role}`;
  
  // Store in localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(newUser));
  
  // Add to mock users for this session
  MOCK_USERS.push(newUser);
  
  return { token, user: newUser };
};

const mockUpdateProfile = async (data: ProfileUpdateData): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  // Get current user
  const userString = localStorage.getItem('user');
  if (!userString) {
    throw new Error('No user found');
  }
  
  const user: User = JSON.parse(userString);
  
  // Update fields
  if (data.name) user.name = data.name;
  if (data.phone) user.phone = data.phone;
  if (data.avatar) user.avatar = data.avatar;
  
  if (data.notificationPreferences) {
    if (!user.notificationPreferences) {
      // Create default if it doesn't exist
      user.notificationPreferences = {
        app: true,
        email: true,
        whatsapp: false
      };
    }
    
    // Update individual properties safely
    if (data.notificationPreferences.app !== undefined) {
      user.notificationPreferences.app = data.notificationPreferences.app;
    }
    if (data.notificationPreferences.email !== undefined) {
      user.notificationPreferences.email = data.notificationPreferences.email;
    }
    if (data.notificationPreferences.whatsapp !== undefined) {
      user.notificationPreferences.whatsapp = data.notificationPreferences.whatsapp;
    }
  }
  
  // Update in localStorage
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
};

// Actual API implementation with real backend
const login = async (data: LoginData): Promise<LoginResponse> => {
  if (USE_MOCK) {
    return mockLogin(data);
  }
  
  console.log('Making real login API call with:', { email: data.email });
  
  try {
    // Clear any previous auth state
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_redirect');
    
    // Make login request
    const response = await axios.post(`${API_URL}/auth/login`, data);
    
    // Save token and user to localStorage
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    console.log('Login successful, token:', response.data.token.substring(0, 15) + '...');
    
    return response.data;
  } catch (error: any) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error;
  }
};

const register = async (data: RegisterData): Promise<LoginResponse> => {
  if (USE_MOCK) {
    return mockRegister(data);
  }
  
  try {
    console.log('Registering with data:', data);
    
    // If creating admin, use the admin endpoint
    let endpoint = '/auth/register';
    
    if (data.role === 'admin') {
      endpoint = '/users/admin';
      console.log('Using admin endpoint for registration');
    } else if (data.role === 'client') {
      endpoint = '/users/client';
      console.log('Using client endpoint for registration');
    } else if (data.role === 'dealer') {
      endpoint = '/users/dealer';
      console.log('Using dealer endpoint for registration');
    }
    
    // Use direct axios instead of authAxios to avoid circular dependencies
    const response = await axios.post(`${API_URL}${endpoint}`, data);
    console.log('Registration successful, response:', response.data);
    
    // Store token and user data if provided
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      console.log('Token stored from registration:', response.data.token.substring(0, 15) + '...');
    }
    
    // For admin creation, we don't get a token back
    const userData = response.data.user || response.data;
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('User data stored from registration');
    
    return {
      token: response.data.token || '',
      user: userData
    };
  } catch (error) {
    console.error('Register API error:', error);
    throw error;
  }
};

const logout = (): void => {
  if (!USE_MOCK) {
    // Call logout endpoint to clear the refresh token cookie
    authAxios.post('/auth/logout')
      .catch(err => console.error('Logout error:', err));
  }
  
  // Clear local storage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const getCurrentUser = async (): Promise<User> => {
  if (USE_MOCK) {
    // Return stored user from localStorage
    const userString = localStorage.getItem('user');
    if (!userString) {
      throw new Error('No user found');
    }
    
    return JSON.parse(userString);
  }
  
  try {
    console.log('Requesting current user data');
    
    // Request current user from API
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Current user data received:', response.data);
    
    // Update stored user
    localStorage.setItem('user', JSON.stringify(response.data));
    
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

const updateProfile = async (data: ProfileUpdateData): Promise<User> => {
  if (USE_MOCK) {
    return mockUpdateProfile(data);
  }
  
  const response = await authAxios.put('/auth/profile', data);
  
  // Update stored user
  localStorage.setItem('user', JSON.stringify(response.data));
  
  return response.data;
};

const getStoredUser = (): User | null => {
  try {
    const userString = localStorage.getItem('user');
    if (!userString) {
      return null;
    }
    
    return JSON.parse(userString);
  } catch (err) {
    console.error('Error parsing stored user:', err);
    return null;
  }
};

const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // Add debugging
  console.log('Auth check:', { 
    hasToken: !!token, 
    hasUser: !!user,
    tokenSnippet: token ? token.substring(0, 15) + '...' : null
  });
  
  return !!token && !!user;
};

const getClients = async (): Promise<User[]> => {
  if (USE_MOCK) {
    return MOCK_USERS.filter(u => u.role === 'client');
  }
  
  const response = await authAxios.get('/users?role=client');
  return response.data;
};

const getDealers = async (): Promise<User[]> => {
  if (USE_MOCK) {
    return MOCK_USERS.filter(u => u.role === 'dealer');
  }
  
  // If user is a client, get their dealers
  const user = getStoredUser();
  if (user && user.role === 'client') {
    const response = await authAxios.get('/users/my-dealers');
    return response.data;
  }
  
  // Otherwise get all dealers
  const response = await authAxios.get('/users?role=dealer');
  return response.data;
};

const getUserById = async (userId: string): Promise<User> => {
  if (USE_MOCK) {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  const response = await authAxios.get(`/users/${userId}`);
  return response.data;
};

const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return;
  }
  
  await authAxios.put('/auth/change-password', { currentPassword, newPassword });
};

const createUser = async (userData: RegisterData): Promise<User> => {
  if (USE_MOCK) {
    return mockRegister(userData).then(res => res.user);
  }
  
  const response = await authAxios.post('/users', userData);
  return response.data;
};

const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    Object.assign(user, userData);
    return user;
  }
  
  const response = await authAxios.put(`/users/${userId}`, userData);
  return response.data;
};

const deleteUser = async (userId: string): Promise<void> => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return;
  }
  
  await authAxios.delete(`/users/${userId}`);
};

const getUserStats = async (userId: string): Promise<any> => {
  if (USE_MOCK) {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      basicStats: user.stats,
      recentActivity: [],
      performanceMetrics: {}
    };
  }
  
  const response = await authAxios.get(`/users/${userId}/stats`);
  return response.data;
};

// New functions for token validation
const checkToken = async (): Promise<boolean> => {
  try {
    console.log('Checking token validity');
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found to validate');
      return false;
    }
    
    // Make a request to validate the token
    const response = await axios.get(`${API_URL}/auth/check-token`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Token validation result:', response.data);
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    
    // Check for 401 errors which indicate invalid token
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.error('Token is invalid, removing from storage');
      localStorage.removeItem('token');
      return false;
    }
    
    return false;
  }
};

// Refresh the token if it exists
const refreshToken = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return null;
    }
    
    const response = await axios.post(
      `${API_URL}/auth/refresh-token`, 
      {}, 
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    if (response.data && response.data.token) {
      console.log('Token refreshed successfully');
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  updateProfile,
  getStoredUser,
  isAuthenticated,
  getClients,
  getDealers,
  getUserById,
  changePassword,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  checkToken,
  refreshToken
}; 