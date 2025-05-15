import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User as AuthUser, LoginData, RegisterData, ProfileUpdateData } from '../services/authService';

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
  
  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Check if we have a stored token and user
        if (authService.isAuthenticated()) {
          // Get the stored token
          const storedToken = localStorage.getItem('token');
          setToken(storedToken);
          
          const storedUser = authService.getStoredUser();
          
          if (storedUser) {
            setUser(convertAuthUser(storedUser));
            // Optionally refresh user data from server
            try {
              const freshUser = await authService.getCurrentUser();
              setUser(convertAuthUser(freshUser));
            } catch (refreshError) {
              console.error('Error refreshing user data:', refreshError);
              // Continue with stored user data
            }
          } else {
            // We have a token but no user, try to get current user
            const currentUser = await authService.getCurrentUser();
            setUser(convertAuthUser(currentUser));
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { email: data.email });
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