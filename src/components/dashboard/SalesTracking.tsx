import React, { useState } from 'react';
import { DollarSign, Plus, TrendingUp, Calendar, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Sale {
  id: string;
  date: string;
  amount: number;
  products: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    isNew: boolean;
  };
  pointsEarned: number;
  status: 'pending' | 'verified' | 'rejected';
}

interface SalesTrackingProps {
  sales: Sale[];
  onRecordSale: () => void;
}

const SalesTracking: React.FC<SalesTrackingProps> = ({ sales, onRecordSale }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  const filteredSales = sales.filter(sale => {
    if (filter === 'all') return true;
    return sale.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare data for the sales trend chart
  const salesTrendData = sales
    .filter(sale => sale.status === 'verified')
    .reduce((acc: any[], sale) => {
      const date = new Date(sale.date).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.amount += sale.amount;
      } else {
        acc.push({ date, amount: sale.amount });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Sales Tracking</h2>
        </div>
        <button
          onClick={onRecordSale}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Sale
        </button>
      </div>

      {/* Sales Trend Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Sales Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['all', 'pending', 'verified', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${filter === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    ${sale.amount.toLocaleString()}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sale.status)}`}>
                    {sale.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Customer: {sale.customer.name}
                  {sale.customer.isNew && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      New
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">
                  +{sale.pointsEarned} points
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(sale.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Products</h4>
              <div className="space-y-2">
                {sale.products.map((product, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {product.quantity}x {product.name}
                    </span>
                    <span className="text-gray-900">
                      ${(product.quantity * product.unitPrice).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {sale.status === 'pending' && (
              <div className="mt-4 text-sm text-yellow-600">
                This sale is pending verification by your client.
              </div>
            )}
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by recording your first sale.
            </p>
            <div className="mt-6">
              <button
                onClick={onRecordSale}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Sale
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesTracking; 