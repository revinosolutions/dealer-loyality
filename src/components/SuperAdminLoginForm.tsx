import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const SuperAdminLoginForm: React.FC = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Attempting login with:', credentials.email);
      
      // First, clear existing token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Attempt direct login
      const response = await axios.post('http://localhost:5000/api/auth/login', credentials);
      
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('Token saved:', response.data.token.substring(0, 15) + '...');
        
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          console.log('User saved:', response.data.user);
        }
        
        setMessage('Login successful! You will be redirected shortly.');
        
        // Call the Auth Context login too
        await login(credentials);
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard/superadmin';
        }, 1500);
      } else {
        setError('Login successful but no token received');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestToken = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }
      
      // Test the token with a simple API call
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Token test successful:', response.data);
      setMessage('Token is valid! User data retrieved.');
    } catch (err: any) {
      console.error('Token test failed:', err);
      setError('Token test failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 border rounded-lg shadow-sm bg-white max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">SuperAdmin Direct Login</h2>
      
      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {message && (
        <div className="p-3 mb-4 bg-green-100 border border-green-300 text-green-700 rounded-md">
          {message}
        </div>
      )}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <button
            type="button"
            onClick={handleTestToken}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Test Token
          </button>
        </div>
      </form>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="font-medium text-sm text-gray-700 mb-2">Current Token:</h3>
        <div className="p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-28">
          {localStorage.getItem('token') || 'No token found'}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLoginForm; 