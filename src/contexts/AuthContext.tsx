import React, { createContext, useContext, useState, useEffect } from 'react';

// Define user roles
export type UserRole = 'super_admin' | 'client' | 'dealer';

// Define user type
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
};

// Define auth context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveRole: (role: UserRole) => void;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@revino.com',
    role: 'super_admin',
  },
  {
    id: '2',
    name: 'Client User',
    email: 'client@example.com',
    role: 'client',
  },
  {
    id: '3',
    name: 'Dealer User',
    email: 'dealer@example.com',
    role: 'dealer',
  },
];

// Create auth provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, check if we're using mock users
      const mockUser = mockUsers.find(u => u.email === email && password === 'password123');
      
      if (mockUser) {
        // Create a mock token
        const token = `mock_token_${mockUser.id}`;
        
        // Set user and token in localStorage
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('token', token);
        return;
      }
      
      // Real API call
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Set user and token in localStorage
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Remove demo role-switching function
  /*
  const setActiveRole = (role: UserRole) => {
    if (!user) return;
    
    setUser({ ...user, role });
    localStorage.setItem(
      'user', 
      JSON.stringify({ ...user, role })
    );
  };
  */

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    setActiveRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;