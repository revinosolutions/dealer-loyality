import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const ProfilePage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize formData with empty values, will update when user is available
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
  });
  
  // Update form data when user data becomes available
  useEffect(() => {
    if (user) {
      console.log('ProfilePage - Setting form data with user:', user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: (user as any)?.location || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically call an API to update the user profile
    // For this demo, we'll just simulate success
    setTimeout(() => {
      setIsEditing(false);
      alert('Profile updated successfully!');
    }, 500);
  };
  
  // Show loading spinner while auth is being checked
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="md:flex">
          <div className="p-6 md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="flex flex-col items-center">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <span className="text-4xl font-medium text-indigo-600">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">{user.role}</p>
              
              {user.company && (
                <div className="mt-2 text-sm text-gray-600">
                  {typeof user.company === 'string' ? user.company : user.company.name}
                </div>
              )}
              
              <div className="mt-6 w-full">
                <div className="flex items-center py-2 border-t border-gray-200">
                  <Shield className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Account Status:</span>
                  <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : user.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status || 'active'}
                  </span>
                </div>
                
                {(user as any)?.joinDate && (
                  <div className="flex items-center py-2 border-t border-gray-200">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Joined:</span>
                    <span className="ml-auto text-sm text-gray-900">
                      {new Date((user as any).joinDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {user.stats?.lastActive && (
                  <div className="flex items-center py-2 border-t border-gray-200">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Last Active:</span>
                    <span className="ml-auto text-sm text-gray-900">
                      {new Date(user.stats.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
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
                      onChange={handleChange}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
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
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-gray-200 pb-4">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                  </div>
                </div>
                
                <div className="flex border-b border-gray-200 pb-4">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                </div>
                
                {user.phone && (
                  <div className="flex border-b border-gray-200 pb-4">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
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
      
      {user.role === 'dealer' && user.points !== undefined && (
        <div className="bg-white shadow rounded-lg overflow-hidden p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reward Points</h3>
          <div className="flex items-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-indigo-600">{user.points}</span>
            </div>
            <div>
              <p className="text-gray-600">Current reward points balance</p>
              <a href="/rewards" className="text-indigo-600 font-medium text-sm hover:text-indigo-700">
                View available rewards →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;