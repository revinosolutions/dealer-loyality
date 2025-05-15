import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AdminPurchaseRequestsWidget from '../components/dashboard/AdminPurchaseRequestsWidget';

// Define the statistics type
interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalDealers: number;
  activeDealers: number;
  organization?: {
    name: string;
    status: string;
  };
}

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalDealers: 0,
    activeDealers: 0
  });
  const [clients, setClients] = useState([]);
  const [dealers, setDealers] = useState([]);

  useEffect(() => {
    // Ensure user is authenticated and is an admin
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const loadAdminData = async () => {
      try {
        setLoading(true);
        setError('');

        // Get organization statistics
        if (user?.organization?.id) {
          const statsResponse = await api.get(`/api/organizations/${user.organization.id}/stats`);
          if (statsResponse.data) {
            setStats(statsResponse.data);
          }

          // Get clients for this organization
          const clientsResponse = await api.get('/api/users?role=client');
          if (clientsResponse.data && clientsResponse.data.users) {
            setClients(clientsResponse.data.users);
          }

          // Get dealers for this organization
          const dealersResponse = await api.get('/api/users?role=dealer');
          if (dealersResponse.data && dealersResponse.data.users) {
            setDealers(dealersResponse.data.users);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading admin dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if not an admin
  if (user.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome, {user.name}!</h1>
        
        {/* Organization Banner */}
        {user.organization && (
          <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mt-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-blue-800">{user.organization.name}</h2>
                <p className="text-sm text-blue-600">
                  {user.organization.description || 'Admin Dashboard'}
                </p>
              </div>
              <div>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${user.organization.status === 'active' ? 'bg-green-100 text-green-800' : 
                  user.organization.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                  'bg-yellow-100 text-yellow-800'}`}>
                  {user.organization.status?.charAt(0).toUpperCase() + user.organization.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalClients}</dd>
                  </dl>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Clients</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.activeClients}</dd>
                  </dl>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Dealers</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalDealers}</dd>
                  </dl>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Dealers</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.activeDealers}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Show message if no clients or dealers yet */}
            {stats.totalClients === 0 && stats.totalDealers === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Getting Started</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Your organization doesn't have any clients or dealers yet. Start by creating a client.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recent Clients Section */}
            {clients.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Clients</h3>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {clients.slice(0, 3).map((client: any) => (
                      <li key={client.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 truncate">{client.name}</p>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${client.status === 'active' ? 'bg-green-100 text-green-800' : 
                                client.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                                {client.status}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                {client.email}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <p>
                                Created: {new Date(client.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {clients.length > 3 && (
                    <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                      <Link 
                        to="/admin/clients" 
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        View all clients →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Purchase Requests Widget */}
            <div className="mt-8">
              <AdminPurchaseRequestsWidget />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Users</h3>
                  <div className="space-y-2">
                    <Link 
                      to="/admin/clients/new" 
                      className="block w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create New Client
                    </Link>
                    <Link 
                      to="/admin/dealers/new" 
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Create New Dealer
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Account Settings</h3>
                  <div className="space-y-2">
                    <Link 
                      to="/admin/profile" 
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Update Profile
                    </Link>
                    
                    <Link 
                      to="/admin/change-password" 
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Change Password
                    </Link>
                    
                    <Link 
                      to="/admin/organization" 
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Organization Settings
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage; 