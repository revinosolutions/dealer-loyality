import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with auth token
const authAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Add token to requests
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types for dashboard components
interface TrendInfo {
  isPositive: boolean;
  value: string;
  label: string;
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.FC<{ className?: string }>;
  trend?: TrendInfo;
  color?: string;
}

// Dashboard card component
const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        {Icon && <Icon className={`text-${color}-500 w-6 h-6`} />}
      </div>
      <div className="flex-grow">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}% {trend.label}
        </div>
      )}
    </div>
  );
};

// Types for analytics data
interface AnalyticsData {
  metrics: {
    users: { 
      total: number; 
      active: number; 
      new: number;
    };
    orders: { 
      total: number; 
      thisMonth: number; 
      lastMonth: number;
      revenue: { 
        total: number; 
        thisMonth: number;
      }
    };
    contests: { 
      total: number; 
      active: number; 
      completed: number;
    };
    products: { 
      total: number; 
      active: number;
    }
  };
  engagement: {
    contestParticipation: Array<any>;
    pointsDistribution: Array<any>;
  };
  monthlyGrowth: {
    users: Array<{
      date: string;
      count: number;
    }>;
    orders: Array<{
      date: string;
      count: number;
      revenue: number;
    }>;
  }
}

const PlatformAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData>({
    metrics: {
      users: { total: 0, active: 0, new: 0 },
      orders: { 
        total: 0, 
        thisMonth: 0, 
        lastMonth: 0,
        revenue: { total: 0, thisMonth: 0 }
      },
      contests: { total: 0, active: 0, completed: 0 },
      products: { total: 0, active: 0 }
    },
    engagement: {
      contestParticipation: [],
      pointsDistribution: []
    },
    monthlyGrowth: {
      users: [],
      orders: []
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is superadmin
        if (user?.role !== 'superadmin') {
          setError('Access denied. Only Super Admins can view platform analytics.');
          setLoading(false);
          return;
        }
        
        // Fetch analytics data from backend
        const response = await authAxios.get('/analytics/platform');
        setData(response.data);
      } catch (err) {
        console.error('Error fetching platform analytics:', err);
        setError('Error loading analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate trends
  const calculateTrend = (current: number, previous: number): TrendInfo => {
    if (previous === 0) return { isPositive: true, value: '0', label: 'No change' };
    
    const change = ((current - previous) / previous) * 100;
    return {
      isPositive: change >= 0,
      value: Math.abs(change).toFixed(1),
      label: change >= 0 ? 'increase' : 'decrease'
    };
  };

  // Format date for charts
  const formatDate = (date: string | number | Date): string => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate trends
  const orderTrend = calculateTrend(
    data.metrics.orders.thisMonth,
    data.metrics.orders.lastMonth
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Platform Analytics</h1>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard 
          title="Total Users" 
          value={data.metrics.users.total.toLocaleString()}
          subtitle={`${data.metrics.users.active.toLocaleString()} active users`}
          icon={() => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>}
          trend={{ isPositive: true, value: '5.2', label: 'this month' }}
          color="blue"
        />
        <DashboardCard 
          title="Total Orders" 
          value={data.metrics.orders.total.toLocaleString()}
          subtitle={`${data.metrics.orders.thisMonth.toLocaleString()} orders this month`}
          icon={() => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>}
          trend={orderTrend}
          color="green"
        />
        <DashboardCard 
          title="Total Revenue" 
          value={formatCurrency(data.metrics.orders.revenue.total)}
          subtitle={formatCurrency(data.metrics.orders.revenue.thisMonth) + ' this month'}
          icon={() => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>}
          trend={{ isPositive: true, value: '3.7', label: 'this month' }}
          color="yellow"
        />
        <DashboardCard 
          title="Active Contests" 
          value={data.metrics.contests.active.toLocaleString()}
          subtitle={`${data.metrics.contests.total.toLocaleString()} total contests`}
          icon={() => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721A48.6 48.6 0 0 1 12 2.25c2.392 0 4.744.175 7.043.513v1.473M15.75 9.728a6.001 6.001 0 0 1-4.395-7.972m15.656 1.008c-.961-.203-1.933-.377-2.915-.52v2.242a6.004 6.004 0 0 1-3.982 5.648m0 0c.337.058.682.11 1.032.157v4.084m0-4.084V2.721c.862.18 1.703.389 2.525.624" />
          </svg>}
          trend={{ isPositive: true, value: '25', label: 'more than last month' }}
          color="purple"
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* User Growth Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">User Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.monthlyGrowth.users}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'New Users']}
                  labelFormatter={(value) => formatDate(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Revenue Growth Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Revenue Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.monthlyGrowth.orders}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value} />
                <Tooltip 
                  formatter={(value, name) => {
                    return name === 'revenue' 
                      ? [formatCurrency(value as number), 'Revenue'] 
                      : [value, 'Orders'];
                  }}
                  labelFormatter={(value) => formatDate(value)}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="count" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* User by Role Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.engagement.pointsDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalPoints"
                  nameKey="_id"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.engagement.pointsDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Contest Status Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Contest Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Active', value: data.metrics.contests.active },
                  { name: 'Completed', value: data.metrics.contests.completed },
                  { name: 'Total', value: data.metrics.contests.total }
                ]}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {[
                    <Cell key="cell-0" fill="#00C49F" />,
                    <Cell key="cell-1" fill="#FFBB28" />,
                    <Cell key="cell-2" fill="#0088FE" />
                  ]}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">System Health</h3>
          <p className="text-gray-600 mb-4">All systems operational</p>
          <div className="flex justify-between items-center">
            <span className="text-green-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Healthy
            </span>
            <button className="text-blue-500 hover:text-blue-700">View Details</button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Latest Users</h3>
          <p className="text-gray-600 mb-4">{data.metrics.users.new} new users this month</p>
          <div className="flex justify-between items-center">
            <span className="text-blue-500">{Math.round((data.metrics.users.new / data.metrics.users.total) * 100)}% growth rate</span>
            <button className="text-blue-500 hover:text-blue-700">View All Users</button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Platform Settings</h3>
          <p className="text-gray-600 mb-4">Manage global platform configuration</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Last updated: 2 days ago</span>
            <button className="text-blue-500 hover:text-blue-700">Configure</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPage; 