import React, { useState, useEffect } from 'react';
import { Trophy, Mail, Lock, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, isAuthenticated, isLoading, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  // Check if already authenticated and check for session expired parameter
  useEffect(() => {
    // Clear the auth redirect flag when loading login page
    sessionStorage.removeItem('auth_redirect');
    
    // Check URL for session expired parameter
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('session') && searchParams.get('session') === 'expired') {
      setSessionExpired(true);
      setError('Your session has expired. Please sign in again to continue.');
    }
    
    // Only redirect if already authenticated
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate, location.search]);

  // Show auth errors
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user types
    if (error) {
      setError('');
      clearError();
      setSessionExpired(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({
        email: formData.email,
        password: formData.password
      });
      // Redirect is handled in the login function and useEffect above
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  };

  const handleDemoLogin = async (role: 'superadmin' | 'admin' | 'client' | 'dealer') => {
    const demoCredentials = {
      superadmin: { email: 'superadmin@revino.com', password: 'password' },
      admin: { email: 'admin@revino.com', password: 'password' },
      client: { email: 'client@example.com', password: 'password' },
      dealer: { email: 'dealer@example.com', password: 'password' }
    };
    
    try {
      await login(demoCredentials[role]);
      // Redirect is handled in the login function and useEffect above
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side (image and branding) */}
      <div className="bg-indigo-700 text-white md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <Trophy size={36} className="mr-3" />
            <h1 className="text-3xl font-bold">Revino</h1>
          </div>
          
          <h2 className="text-3xl font-bold mb-6">
            Revolutionize Your Dealer Incentive Programs
          </h2>
          
          <p className="text-indigo-200 mb-6">
            Boost sales performance, enhance dealer loyalty, and optimize your channel 
            partnerships with our comprehensive loyalty platform.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-indigo-600 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Performance Tracking</h3>
              <p className="text-indigo-200 text-sm">Real-time insights into dealer performance</p>
            </div>
            <div className="bg-indigo-600 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Reward Management</h3>
              <p className="text-indigo-200 text-sm">Streamlined incentive and reward distribution</p>
            </div>
            <div className="bg-indigo-600 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Contest Creation</h3>
              <p className="text-indigo-200 text-sm">Easily launch and manage sales competitions</p>
            </div>
            <div className="bg-indigo-600 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Advanced Analytics</h3>
              <p className="text-indigo-200 text-sm">Powerful insights to optimize programs</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side (login form) */}
      <div className="bg-white md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your account</p>
            <div className="mt-4">
              <button 
                onClick={() => navigate('/')} 
                className="text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-md flex items-center mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Home
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {sessionExpired ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-amber-800">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Your session has expired</p>
                  <p className="text-sm">For security reasons, you've been logged out. Please sign in again to continue.</p>
                </div>
              </div>
            ) : error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}
            
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8">
            <button
              onClick={() => setShowDemoOptions(!showDemoOptions)}
              className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Try Demo Access
            </button>
            
            {showDemoOptions && (
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => handleDemoLogin('superadmin')}
                  className="w-full bg-blue-100 text-blue-800 py-2 px-4 rounded-md hover:bg-blue-200 transition-colors"
                  disabled={isLoading}
                >
                  Demo Superadmin Login
                </button>
                <button
                  onClick={() => handleDemoLogin('admin')}
                  className="w-full bg-emerald-100 text-emerald-800 py-2 px-4 rounded-md hover:bg-emerald-200 transition-colors"
                  disabled={isLoading}
                >
                  Demo Admin Login
                </button>
                <button
                  onClick={() => handleDemoLogin('client')}
                  className="w-full bg-purple-100 text-purple-800 py-2 px-4 rounded-md hover:bg-purple-200 transition-colors"
                  disabled={isLoading}
                >
                  Client Demo
                </button>
                <button
                  onClick={() => handleDemoLogin('dealer')}
                  className="w-full bg-pink-100 text-pink-800 py-2 px-4 rounded-md hover:bg-pink-200 transition-colors"
                  disabled={isLoading}
                >
                  Dealer Demo
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;