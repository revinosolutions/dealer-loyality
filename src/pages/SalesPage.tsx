import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, ChevronDown, Download, Filter, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

type SalesPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type SalesMetric = 'revenue' | 'units' | 'growth';

type SalesEntry = {
  id: string;
  date: string;
  product: string;
  units: number;
  revenue: number;
  dealer?: string;
  region?: string;
};

// Mock sales data
const mockSalesEntries: SalesEntry[] = [
  {
    id: '1',
    date: '2024-03-15',
    product: 'Premium Widget',
    units: 3,
    revenue: 150000,
    dealer: 'Eastside Motors',
    region: 'Northeast',
  },
  {
    id: '2',
    date: '2024-03-16',
    product: 'Standard Widget',
    units: 5,
    revenue: 175000,
    dealer: 'Westlake Automotive',
    region: 'Midwest',
  },
  {
    id: '3',
    date: '2024-03-18',
    product: 'Basic Widget',
    units: 8,
    revenue: 160000,
    dealer: 'Sunshine Dealership',
    region: 'South',
  },
  {
    id: '4',
    date: '2024-03-20',
    product: 'Deluxe Widget',
    units: 2,
    revenue: 180000,
    dealer: 'Mountain View Sales',
    region: 'West',
  },
  {
    id: '5',
    date: '2024-03-22',
    product: 'Premium Widget',
    units: 4,
    revenue: 200000,
    dealer: 'Coastal Automotive Group',
    region: 'Northwest',
  },
  {
    id: '6',
    date: '2024-03-25',
    product: 'Standard Widget',
    units: 6,
    revenue: 210000,
    dealer: 'Eastside Motors',
    region: 'Northeast',
  },
  {
    id: '7',
    date: '2024-03-28',
    product: 'Basic Widget',
    units: 10,
    revenue: 200000,
    dealer: 'Westlake Automotive',
    region: 'Midwest',
  },
];

const SalesPage = () => {
  const { user } = useAuth();
  const { stats, loading: dataLoading, error: dataError } = useData();
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>(mockSalesEntries);
  const [period, setPeriod] = useState<SalesPeriod>('monthly');
  const [metric, setMetric] = useState<SalesMetric>('revenue');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '2024-03-01',
    end: '2024-03-31',
  });
  const [productFilter, setProductFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate summary metrics
  const totalRevenue = salesEntries.reduce((sum, entry) => sum + entry.revenue, 0);
  const totalUnits = salesEntries.reduce((sum, entry) => sum + entry.units, 0);
  const averagePerUnit = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  // Get growth data from stats
  const revenueGrowth = stats?.salesGrowth || 12.5;
  const unitsGrowth = 8.3;

  // Get unique products, regions, and dealers for filters
  const products = Array.from(new Set(salesEntries.map(entry => entry.product)));
  const regions = Array.from(new Set(salesEntries.filter(entry => entry.region).map(entry => entry.region as string)));
  const dealers = Array.from(new Set(salesEntries.filter(entry => entry.dealer).map(entry => entry.dealer as string)));

  // Filter sales entries
  const filteredSalesEntries = salesEntries.filter(entry => {
    // Date range filter
    const entryDate = new Date(entry.date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    if (entryDate < startDate || entryDate > endDate) {
      return false;
    }

    // Product filter
    if (productFilter !== 'all' && entry.product !== productFilter) {
      return false;
    }

    // Region filter
    if (regionFilter !== 'all' && entry.region !== regionFilter) {
      return false;
    }

    // Dealer filter
    if (dealerFilter !== 'all' && entry.dealer !== dealerFilter) {
      return false;
    }

    return true;
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
    );
  }

  if (dataError) {
    return (
      <div className="text-red-500 text-center p-4">
          Error: {dataError}
        </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Performance</h1>
            <p className="text-gray-600">
              {user?.role === 'dealer' 
                ? 'Track your sales performance and revenue.'
                : 'Monitor sales performance across all dealers.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                Filters
                <ChevronDown size={16} />
              </button>
            </div>
            
            {/* Export button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">All Products</option>
                  {products.map((product) => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">All Regions</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dealer</label>
                <select
                  value={dealerFilter}
                  onChange={(e) => setDealerFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">All Dealers</option>
                  {dealers.map((dealer) => (
                    <option key={dealer} value={dealer}>{dealer}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {revenueGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(revenueGrowth)}%
              </span>
              <span className="text-sm text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Units Sold</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnits}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {unitsGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${unitsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(unitsGrowth)}%
              </span>
              <span className="text-sm text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Price per Unit</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(averagePerUnit)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  {user?.role !== 'dealer' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSalesEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.units}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(entry.revenue)}</td>
                    {user?.role !== 'dealer' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.dealer}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.region}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
};

export default SalesPage;