import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, Award, ArrowUp, ArrowDown, BarChart3, DollarSign, Trophy } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Define data types
interface MonthlyData {
  month: string;
  value: number;
}

interface Product {
  name: string;
  units: number;
  revenue: number;
}

interface AnalyticsData {
  totalSales: number;
  salesGrowth: number;
  activeClients: number;
  clientGrowth: number;
  topProducts: Product[];
  monthlySales: MonthlyData[];
  totalPoints: number;
  pointsGrowth: number;
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { stats, salesData, loading, error, refreshData } = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('sales');
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  console.log('AnalyticsPage - Stats:', stats);
  console.log('AnalyticsPage - SalesData:', salesData);

  // Ensure only admin can access this page
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Memoize performance metrics to prevent unnecessary recalculations
  const performanceMetrics = useMemo(() => [
    {
      title: 'Sales Volume',
      value: `$${stats?.totalSales?.toLocaleString() || 0}`,
      change: stats?.salesGrowth || 0,
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Dealers',
      value: '150',
      change: 5.2,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Contest Participation',
      value: stats?.activeContests?.toString() || '0',
      change: 12.5,
      icon: Award,
      color: 'bg-purple-500'
    },
    {
      title: 'Reward Redemption',
      value: stats?.pendingRewards?.toString() || '0',
      change: -2.1,
      icon: Award,
      color: 'bg-yellow-500'
    }
  ], [stats]);

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!salesData || !salesData.length) return [];
    return salesData.map(data => ({
      date: new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: data[selectedMetric as keyof typeof data] as number || 0
    }));
  }, [salesData, selectedMetric]);

  // Load insights only when period or metric changes
  useEffect(() => {
    let mounted = true;
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        if (mounted) {
          setInsights([
            'Sales have increased by 15% compared to last month',
            'Top performing category is Electronics with 30% growth',
            'Customer engagement is highest during weekends',
            'Recommend increasing inventory for high-demand products'
          ]);
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        if (mounted) {
          setLoadingInsights(false);
        }
      }
    };

    fetchInsights();
    return () => {
      mounted = false;
    };
  }, [selectedPeriod, selectedMetric]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your performance and track key metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={() => refreshData()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.color}`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {metric.change >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(metric.change)}%
              </span>
              <span className="text-sm text-gray-600 ml-1">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sales">Sales</option>
              <option value="points">Points</option>
              <option value="participants">Participants</option>
            </select>
          </div>
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for selected period
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">AI-Powered Insights</h2>
          {loadingInsights ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.totalSales || 0)}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp size={16} className="mr-1" /> 
                {stats?.salesGrowth || 0}% from last month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalPoints || 0}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp size={16} className="mr-1" /> 
                {stats?.pointsGrowth || 0}% from last month
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Contests</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.activeContests || 0}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp size={16} className="mr-1" /> 
                12% from last month
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Top Products Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Sales</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(stats?.totalSales || 0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency((stats?.totalSales || 0) * 0.85)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">+15%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Reward Points</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{stats?.totalPoints || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(stats?.totalPoints || 0) * 0.92}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">+8%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Active Contests</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{stats?.activeContests || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(stats?.activeContests || 0) - 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">+20%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;