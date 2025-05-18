import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User as AuthUser, LoginData, RegisterData, ProfileUpdateData } from '../services/authService';
import { checkAndRefreshToken } from '../utils/authTokenRefresherESM';

// Define user roles
// superadmin: Platform owner (Revino) who manages all manufacturers/admins
// admin: Manufacturer (produces and sells products to clients)
// client: Bulk buyers (purchase from manufacturer and sell to dealers)
// dealer: Retailers (purchase from clients and sell to end consumers)
type UserRole = 'superadmin' | 'admin' | 'client' | 'dealer';

// Define user type
interface User {
  id: string;
  _id?: string; // MongoDB ID field
  name: string;
  email: string;
  role: UserRole;
  points: number;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  organization?: {
    id: string;
    name: string;
    status?: 'active' | 'inactive' | 'suspended';
    description?: string;
    logo?: string;
    contactInfo?: any;
    createdAt?: string;
    settings?: {
      theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        logoUrl?: string;
      };
    };
  };
  // ... other existing fields
}

// Helper function to convert API user to our internal format
const convertAuthUser = (apiUser: AuthUser): User => {
  // Ensure status is a valid value
  let status: 'active' | 'inactive' | 'suspended' = 'active';
  if (apiUser.status === 'inactive' || apiUser.status === 'suspended') {
    status = apiUser.status;
  }

  // Preserve _id if it exists, for MongoDB compatibility
  return {
    id: apiUser.id,
    _id: (apiUser as any)._id, // Preserve MongoDB _id if available
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role as UserRole,
    points: apiUser.points || 0,
    avatar: apiUser.avatar,
    phone: apiUser.phone,
    status,
    organization: apiUser.organization,
    // ... map other fields
  };
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  clearError: () => void;
  getUsers: (role?: UserRole) => Promise<User[]>;
  updateUser: (id: string, data: any) => Promise<User>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateProfile: async () => {},
  clearError: () => {},
  getUsers: async () => [],
  updateUser: async () => ({ id: '', name: '', email: '', role: 'dealer', points: 0, avatar: '', status: 'active' })
});

export const useAuth = () => useContext(AuthContext);

// Force redirect to a specific path
const forceRedirect = (path: string) => {
  setTimeout(() => {
    window.location.href = path;
  }, 100);
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load user from localStorage synchronously to prevent UI flicker
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      console.log('Initial token load from localStorage');
      setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Initial user load from localStorage:', parsedUser?.email);
        setUser(convertAuthUser(parsedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  }, []);
  
  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      // Don't set loading to true if we already have a user from localStorage
      if (!user) {
        setIsLoading(true);
      }
      
      try {
        // Check if we have a stored token and user
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          console.log('Found token in localStorage, attempting to initialize auth');
          setToken(storedToken);
          
          // Load user from localStorage immediately to prevent UI flicker
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            console.log('Found user data in localStorage, setting initial state');
            setUser(convertAuthUser(storedUser));
          }
          
          // Try to refresh the token first for improved reliability
          let newToken = null;
          try {
            console.log('Auth context initializing, attempting to refresh token');
            newToken = await checkAndRefreshToken();
            
            // If token was refreshed, update it
            if (newToken) {
              console.log('Token was refreshed during initialization');
              setToken(newToken);
            }
          } catch (refreshTokenError) {
            console.warn('Failed to refresh token during initialization:', refreshTokenError);
            // Continue with the stored token - don't fail authentication yet
          }
          
          // Try to get user data in multiple ways to ensure we have it
          let userData = null;
          
          // 1. First try getting from localStorage if we haven't already
          if (!storedUser) {
            const localUser = authService.getStoredUser();
            if (localUser) {
              console.log('Found user data in localStorage');
              userData = localUser;
              setUser(convertAuthUser(localUser));
            }
          } else {
            userData = storedUser;
          }
          
          // 2. Then try to refresh from server regardless
          try {
            console.log('Fetching fresh user data from server');
            const freshUser = await authService.getCurrentUser();
            
            if (freshUser) {
              console.log('Successfully fetched fresh user data');
              userData = freshUser;
              setUser(convertAuthUser(freshUser));
              
              // Update localStorage with the fresh data
              localStorage.setItem('user', JSON.stringify(freshUser));
            }
          } catch (userError) {
            console.error('Error fetching user data from server:', userError);
            
            // If we couldn't get fresh data but have stored data, use that
            if (userData) {
              console.log('Using stored user data as fallback');
            } else {
              // Try direct fetch as last resort
              try {
                console.log('Attempting direct fetch for user data as last resort');
                const directResponse = await fetch('/api/auth/me', {
                  headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'x-auth-token': storedToken
                  }
                });
                
                if (directResponse.ok) {
                  const directUser = await directResponse.json();
                  console.log('Direct fetch for user data succeeded');
                  userData = directUser;
                  setUser(convertAuthUser(directUser));
                  localStorage.setItem('user', JSON.stringify(directUser));
                } else {
                  throw new Error(`Direct fetch failed: ${directResponse.status}`);
                }
              } catch (directError) {
                console.error('Direct fetch for user data also failed:', directError);
                // If we have no user data at all, this is an error state
                console.error('No valid user data found with token');
                throw new Error('Authentication failed - no valid user data found');
              }
            }
          }
          
          // Final check - if we still don't have user data, authentication has failed
          if (!userData) {
            console.error('Failed to load user data despite having token');
            throw new Error('Authentication failed - could not load user data');
          }
        } else {
          console.log('No token found, user is not authenticated');
          // Clear any stale user data if we don't have a token
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // If anything fails, clear auth state completely, but keep token for direct API access
        // Don't clear localStorage['token'] here
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Set up event listeners for token refresh events
    const handleTokenRefreshed = (event: Event) => {
      console.log('Received token-refreshed event, updating auth state');
      
      // Update token state from localStorage
      const refreshedToken = localStorage.getItem('token');
      if (refreshedToken && refreshedToken !== token) {
        setToken(refreshedToken);
        console.log('Updated token state after refresh event');
      }
      
      // Check if user data needs to be updated
      const storedUser = authService.getStoredUser();
      if (storedUser) {
        setUser(convertAuthUser(storedUser));
        console.log('Updated user state after token refresh');
      }
    };
    
    // Handle auth invalidation event
    const handleTokenInvalidated = (event: Event) => {
      console.warn('Received token-invalid event, logging out');
      authService.logout();
      setUser(null);
      setToken(null);
      
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired';
      }
    };

    // Handle auth warning event - don't immediately log out
    const handleTokenWarning = (event: Event) => {
      console.warn('Received token-warning event, attempting recovery');
      
      // Try to refresh the token after a delay
      setTimeout(async () => {
        try {
          const newToken = await checkAndRefreshToken();
          if (newToken) {
            console.log('Successfully refreshed token after warning');
            // Refresh user data
            try {
              const freshUser = await authService.getCurrentUser();
              if (freshUser) {
                setUser(convertAuthUser(freshUser));
                console.log('Successfully refreshed user data after warning');
              }
            } catch (userError) {
              console.error('Failed to refresh user data after warning:', userError);
            }
          } else {
            console.warn('Failed to refresh token after warning');
          }
        } catch (refreshError) {
          console.error('Error refreshing token after warning:', refreshError);
        }
      }, 3000);
    };
    
    // Register event listeners
    window.addEventListener('auth-token-refreshed', handleTokenRefreshed);
    window.addEventListener('auth-token-invalid', handleTokenInvalidated);
    window.addEventListener('auth-token-warning', handleTokenWarning);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('auth-token-refreshed', handleTokenRefreshed);
      window.removeEventListener('auth-token-invalid', handleTokenInvalidated);
      window.removeEventListener('auth-token-warning', handleTokenWarning);
    };
  }, []);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { email: data.email });
      
      // Clear any previous auth redirect flag
      sessionStorage.removeItem('auth_redirect');
      
      const response = await authService.login(data);
      
      console.log('Login successful:', response);
      
      // Explicitly set token and user in state
      setUser(convertAuthUser(response.user));
      setToken(response.token);
      
      // Double-check token is in localStorage
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        console.log('Token confirmed in localStorage:', storedToken.substring(0, 15) + '...');
      } else {
        console.error('Token not found in localStorage after login');
        localStorage.setItem('token', response.token);
        console.log('Re-saved token to localStorage');
      }
      
      // Force redirect to dashboard
      console.log('Login successful, redirecting to dashboard...');
      forceRedirect('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(data);
      setUser(convertAuthUser(response.user));
      setToken(response.token);
      
      // Force redirect to dashboard
      forceRedirect('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      console.error('Register error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    forceRedirect('/login');
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(convertAuthUser(updatedUser));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Get users filtered by role
  const getUsers = async (role?: UserRole): Promise<User[]> => {
    try {
      // Use real data from the API now
      if (role === 'client') {
        const clients = await authService.getClients();
        return clients as User[];
      } else if (role === 'dealer') {
        const dealers = await authService.getDealers();
        return dealers as User[];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  // Update user
  const updateUser = async (id: string, data: any): Promise<User> => {
    try {
      // Use the real API call
      const updatedUser = await authService.updateUser(id, data);
      
      if (user && id === user.id) {
        // If updating the current user, update the local state
        setUser(convertAuthUser(updatedUser));
      }
      
      return convertAuthUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const authContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    getUsers,
    updateUser
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;