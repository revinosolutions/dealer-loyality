import React, { useState } from 'react';
import { Trophy, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);
  
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error handling is done in the auth context
    }
  };

  const handleDemoLogin = async (role: 'super_admin' | 'client' | 'dealer') => {
    const demoCredentials = {
      super_admin: { email: 'admin@revino.com', password: 'password123' },
      client: { email: 'client@example.com', password: 'password123' },
      dealer: { email: 'dealer@example.com', password: 'password123' },
    };
    
    try {
      const { email, password } = demoCredentials[role];
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error handling is done in the auth context
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
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
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
                  onClick={() => handleDemoLogin('super_admin')}
                  className="w-full bg-amber-100 text-amber-800 py-2 px-4 rounded-md hover:bg-amber-200 transition-colors"
                  disabled={loading}
                >
                  Super Admin Demo
                </button>
                <button
                  onClick={() => handleDemoLogin('client')}
                  className="w-full bg-emerald-100 text-emerald-800 py-2 px-4 rounded-md hover:bg-emerald-200 transition-colors"
                  disabled={loading}
                >
                  Client Demo
                </button>
                <button
                  onClick={() => handleDemoLogin('dealer')}
                  className="w-full bg-blue-100 text-blue-800 py-2 px-4 rounded-md hover:bg-blue-200 transition-colors"
                  disabled={loading}
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