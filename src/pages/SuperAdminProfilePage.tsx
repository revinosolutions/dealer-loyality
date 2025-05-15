import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield, Key, FileText, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Define extended user properties that might not be in the base User type
type ExtendedUserInfo = {
  location?: string;
  joinDate?: string;
  company?: string;
  avatar?: string;
}

// Mock user for debugging when authentication fails
const MOCK_SUPERADMIN = {
  id: 'debug-superadmin-id',
  name: 'Debug Superadmin',
  email: 'debug@example.com',
  role: 'superadmin',
  points: 5000,
  avatar: '',
  status: 'active' as const,
  phone: '+1234567890'
};

const SuperAdminProfilePage = () => {
  console.log('SuperAdminProfilePage - Component initializing');
  
  const { user: activeUser, isLoading: isAuthLoading, isAuthenticated, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Debug flag for using a mock superadmin user when testing
  const useDebugUser = false;
  
  // Debug info for authentication state
  useEffect(() => {
    console.log('SuperAdminProfilePage - Auth state:', { 
      isAuthenticated, 
      isAuthLoading, 
      hasUser: !!activeUser,
      userRole: activeUser?.role || 'none'
    });
  }, [isAuthenticated, isAuthLoading, activeUser]);
  
  // If loading, show loading spinner
  if (isAuthLoading) {
    console.log('SuperAdminProfilePage - Auth loading');
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  // If no authentication, show error
  if (!isAuthenticated) {
    console.log('SuperAdminProfilePage - Not authenticated');
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Authentication Error</h2>
        <p className="mt-2">You must be logged in to view this page.</p>
      </div>
    );
  }
  
  // If no user data, show error
  if (!activeUser) {
    console.log('SuperAdminProfilePage - No user data available');
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">User Data Error</h2>
        <p className="mt-2">User data is missing. Try logging in again.</p>
      </div>
    );
  }
  
  // If not a superadmin, show error
  if (activeUser.role !== 'superadmin') {
    console.log('SuperAdminProfilePage - Not a superadmin', activeUser.role);
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You must have superadmin privileges to view this page.</p>
        <p className="mt-2">Current role: {activeUser.role}</p>
      </div>
    );
  }
  
  // Default user data with optional fields - initialize safely even if user is null
  const extendedUser: ExtendedUserInfo = {
    location: activeUser ? (activeUser as any)?.location || 'Unknown Location' : 'Unknown Location',
    joinDate: activeUser ? (activeUser as any)?.joinDate || '2023-01-15T00:00:00Z' : '2023-01-15T00:00:00Z',
    company: activeUser ? (activeUser as any)?.company || 'Revino Platform' : 'Revino Platform',
    avatar: activeUser ? (activeUser as any)?.avatar || '' : ''
  };
  
  const [formData, setFormData] = useState({
    name: activeUser?.name || '',
    email: activeUser?.email || '',
    phone: activeUser?.phone || '',
    location: extendedUser.location || '',
  });

  // Ensure formData is updated when user data becomes available
  useEffect(() => {
    if (activeUser) {
      console.log('Updating form data with user:', activeUser);
      setFormData({
        name: activeUser.name || '',
        email: activeUser.email || '',
        phone: activeUser.phone || '',
        location: (activeUser as any)?.location || extendedUser.location || '',
      });
    }
  }, [activeUser]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form data when user data changes
  useEffect(() => {
    if (activeUser) {
      setFormData({
        name: activeUser.name || '',
        email: activeUser.email || '',
        phone: activeUser.phone || '',
        location: (activeUser as any)?.location || '',
      });
    }
  }, [activeUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // In a real app, call the API to update user profile
      if (useDebugUser) {
        // Simulate API call for debug user
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Debug mode: Updating profile with:', formData);
      } else {
        await updateProfile(formData);
      }
      
      setIsEditing(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to update profile.', type: 'error' });
      console.error('Error updating profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setMessage({ text: 'New password must be at least 8 characters.', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // In a real app, call the API to change password
      // await authService.changePassword(passwordData);
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setMessage({ text: 'Password changed successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to change password.', type: 'error' });
      console.error('Error changing password:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // In a real app, call the API to generate a new API key
      // await apiService.generateNewKey();
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulating a new API key
      const newApiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
      
      // Show the API key to the user (in a real app, you might want to show this in a modal)
      alert(`Your new API key is: ${newApiKey}\n\nPlease save this securely as it won't be shown again.`);
      setMessage({ text: 'New API key generated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to generate new API key.', type: 'error' });
      console.error('Error generating API key:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Access control - only allow superadmin users
  if (activeUser?.role !== 'superadmin') {
    console.log(`SuperAdminProfilePage - Access denied: user role is ${activeUser?.role}`);
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You must be a Super Administrator to access this page.</p>
        {useDebugUser && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Reload Page
          </button>
        )}
      </div>
    );
  }

  // Add error handling for debugging the blank page issue
  try {
    console.log('SuperAdminProfilePage - Rendering profile with user:', activeUser);
  } catch (error) {
    console.error('SuperAdminProfilePage - Error in component:', error);
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Error Loading Profile</h2>
        <p className="mt-2">There was an error loading your profile. Please try refreshing the page.</p>
        <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto max-h-40">
          {JSON.stringify({ error, authState: { isAuthenticated, isAuthLoading, hasUser: !!activeUser } }, null, 2)}
        </pre>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 bg-gray-50">
      {useDebugUser && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Debug Mode:</strong>
          <span className="block sm:inline"> Using mock superadmin user for debugging.</span>
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-900">Super Admin Profile</h1>
      
      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      {/* Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="md:flex">
          {/* Profile Sidebar */}
          <div className="p-6 md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="flex flex-col items-center">
              {extendedUser.avatar ? (
                <img 
                  src={extendedUser.avatar} 
                  alt={activeUser.name} 
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <span className="text-4xl font-medium text-indigo-600">
                    {activeUser.name?.[0]?.toUpperCase() || 'S'}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-900">{activeUser.name}</h2>
              <div className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium mt-2">
                Super Administrator
              </div>
              
              {extendedUser.company && (
                <div className="mt-2 text-sm text-gray-600">{extendedUser.company}</div>
              )}
              
              <div className="w-full mt-4 space-y-2">
                <div className="flex items-center py-2 border-t border-gray-200">
                  <Shield className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Account Status:</span>
                  <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                {extendedUser.joinDate && (
                  <div className="flex items-center py-2 border-t border-gray-200">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Joined:</span>
                    <span className="ml-auto text-sm text-gray-900">
                      {new Date(extendedUser.joinDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center py-2 border-t border-gray-200">
                  <Key className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">API Access:</span>
                  <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Enabled
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Content */}
          <div className="p-6 md:w-2/3">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      className="pl-10 block w-full bg-gray-50 border-gray-300 rounded-md shadow-sm text-gray-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-500">
                      Cannot change
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Your location"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-gray-200 pb-4">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-sm text-gray-900">{activeUser.name}</p>
                  </div>
                </div>
                
                <div className="flex border-b border-gray-200 pb-4">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{activeUser.email}</p>
                  </div>
                </div>
                
                {activeUser.phone && (
                  <div className="flex border-b border-gray-200 pb-4">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="mt-1 text-sm text-gray-900">{activeUser.phone}</p>
                    </div>
                  </div>
                )}
                
                {formData.location && (
                  <div className="flex border-b border-gray-200 pb-4">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="mt-1 text-sm text-gray-900">{formData.location}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Security Settings */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        </div>
        
        <div className="p-6">
          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your current password"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your new password"
                    required
                    minLength={8}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Confirm your new password"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Password</h4>
                  <p className="text-sm text-gray-500">Change your account password</p>
                </div>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Change
                </button>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add additional security to your account</p>
                </div>
                <button
                  className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800"
                >
                  Enable
                </button>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">API Key</h4>
                  <p className="text-sm text-gray-500">Manage your API access</p>
                </div>
                <button
                  onClick={handleGenerateApiKey}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  disabled={isSubmitting}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Generate New Key
                </button>
              </div>
              
              <div className="flex justify-between items-center pb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Account Activity Log</h4>
                  <p className="text-sm text-gray-500">View your recent account activity</p>
                </div>
                <button
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <FileText size={14} className="mr-1" />
                  View Log
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfilePage;