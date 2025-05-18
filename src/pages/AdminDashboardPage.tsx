import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

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

  // Add debugging log
  useEffect(() => {
    console.log('AdminDashboardPage state:', { user, loading, error, stats });
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

  try {
    if (!user) {
      return <div>Loading...</div>;  // Fallback for no user
    }
    if (user.role !== 'admin') {
      return <div>Access Denied</div>;  // Fallback for non-admin
    }
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome, {user.name}!</h1>
          
          {/* Organization Banner */}
          {user.organization && user.organization.status && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mt-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-blue-800">{user.organization.name || 'Organization'}</h2>
                  <p className="text-sm text-blue-600">
                    {user.organization.description || 'Admin Dashboard'}
                  </p>
                </div>
                <div>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.organization.status === 'active' ? 'bg-green-100 text-green-800' : 
                    user.organization.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                    {user.organization.status.charAt(0).toUpperCase() + user.organization.status.slice(1)}
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
              {!loading && !error && stats.totalClients === 0 && stats.totalDealers === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
                  <p>No data available. Please check your authentication or try refreshing the page.</p>
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
              
              {/* Purchase Requests widget removed */}
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Recent Orders */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
                  {/* Recent Orders Content */}
                  <div className="text-center text-gray-500 py-4">
                    <p>Recent orders will appear here.</p>
                  </div>
                </div>
                
                {/* Popular Products */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Products</h3>
                  {/* Popular Products Content */}
                  <div className="text-center text-gray-500 py-4">
                    <p>Popular products will appear here.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  } catch (err) {
    console.error('Unexpected error in AdminDashboardPage:', err);
    return <div className="bg-red-100 p-4">An unexpected error occurred. Please refresh or check logs.</div>;
  }
};

export default AdminDashboardPage; 