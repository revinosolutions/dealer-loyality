import React, { useState, useEffect } from 'react';
import { Trophy, Users, BarChart3, Gift, Package, ShoppingCart, ClipboardList, Inbox } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getPurchaseRequestStats } from '../services/purchaseRequestsApi';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    pendingRequests: 0,
    inventory: 0
  });

  useEffect(() => {
    // Fetch stats if user is admin
    if (user?.role === 'admin') {
      fetchPendingRequests();
    } else if (user?.role === 'client') {
      fetchClientPendingRequests();
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      // Get pending purchase requests count for admin
      const organizationId = user?.organization?.id;
      const response = await getPurchaseRequestStats(organizationId);
      
      // Update stats with the count of pending requests
      setStats(prev => ({
        ...prev,
        pendingRequests: response.pending || 0
      }));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };
  
  const fetchClientPendingRequests = async () => {
    try {
      // For client, we only need to know about their own requests
      const response = await getPurchaseRequestStats();
      
      setStats(prev => ({
        ...prev,
        pendingRequests: response.pending || 0
      }));
    } catch (error) {
      console.error('Error fetching client pending requests:', error);
    }
  };

  // Admin-specific cards for quick access
  const adminCards = [
    {
      title: 'Products',
      description: 'Manage your product catalog',
      icon: <Package className="h-6 w-6 text-blue-500" />,
      path: '/dashboard/admin-products',
      color: 'bg-blue-50 border-blue-200',
      count: stats.products || 0
    },
    {
      title: 'Purchase Requests',
      description: 'Review client purchase requests',
      icon: <ShoppingCart className="h-6 w-6 text-purple-500" />,
      path: '/dashboard/admin-purchase-requests',
      color: 'bg-purple-50 border-purple-200',
      count: stats.pendingRequests || 0,
      badge: stats.pendingRequests ? {
        text: `${stats.pendingRequests} pending`,
        color: 'bg-yellow-100 text-yellow-800'
      } : undefined
    },
    {
      title: 'Inventory',
      description: 'Manage your inventory levels',
      icon: <ClipboardList className="h-6 w-6 text-green-500" />,
      path: '/dashboard/inventory-management',
      color: 'bg-green-50 border-green-200',
      count: stats.inventory || 0
    },
  ];
  
  // Client-specific cards
  const clientCards = [
    {
      title: 'Products Catalog',
      description: 'Browse available products',
      icon: <Package className="h-6 w-6 text-blue-500" />,
      path: '/dashboard/admin-products-catalog',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Purchase Requests',
      description: 'Manage your product requests',
      icon: <Inbox className="h-6 w-6 text-purple-500" />,
      path: '/dashboard/client-purchase-requests',
      color: 'bg-purple-50 border-purple-200',
      badge: stats.pendingRequests ? {
        text: `${stats.pendingRequests} pending`,
        color: 'bg-yellow-100 text-yellow-800'
      } : undefined
    },
    {
      title: 'Orders',
      description: 'View your product orders',
      icon: <ShoppingCart className="h-6 w-6 text-green-500" />,
      path: '/dashboard/client-orders',
      color: 'bg-green-50 border-green-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Admin Quick Access Cards */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {adminCards.map((card, index) => (
            <Link 
              key={index} 
              to={card.path}
              className={`block p-4 rounded-lg shadow-sm border ${card.color} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center">
                <div className="mr-4">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </div>
                {card.badge && (
                  <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${card.badge.color}`}>
                    {card.badge.text}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Client Quick Access Cards */}
      {user?.role === 'client' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clientCards.map((card, index) => (
            <Link 
              key={index} 
              to={card.path}
              className={`block p-4 rounded-lg shadow-sm border ${card.color} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center">
                <div className="mr-4">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </div>
                {card.badge && (
                  <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${card.badge.color}`}>
                    {card.badge.text}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

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