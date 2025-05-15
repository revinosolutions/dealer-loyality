import React from 'react';
import { Trophy, Users, BarChart3, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-2xl font-semibold text-gray-900">{user?.points || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Trophy className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
            
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Contests</p>
              <p className="text-2xl font-semibold text-gray-900">3</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Rewards</p>
              <p className="text-2xl font-semibold text-gray-900">5</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Network Size</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
          
      {/* Welcome Message */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome back, {user?.name}!</h2>
        <p className="text-gray-600">
          Here's what's happening in your account today.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;