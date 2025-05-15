import React, { useState, useEffect } from 'react';
import { Gift, Search, Filter, ChevronDown, Award, Check, Clock, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

type Reward = {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: string;
  status: 'available' | 'redeemed' | 'processing';
  imageUrl?: string;
  stock?: number;
  featured?: boolean;
};

type RedemptionHistory = {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  date: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
};

// Mock rewards data
const mockRewards: Reward[] = [
  {
    id: '1',
    title: 'Premium Tech Bundle',
    description: 'Latest tablet, wireless headphones, and smartwatch',
    pointsCost: 5000,
    category: 'Electronics',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '2',
    title: 'Luxury Weekend Getaway',
    description: 'Two-night stay at a 5-star resort with dining credit',
    pointsCost: 8000,
    category: 'Travel',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '3',
    title: 'Premium Office Chair',
    description: 'Ergonomic design with adjustable features',
    pointsCost: 3500,
    category: 'Office',
    status: 'redeemed',
    imageUrl: 'https://images.unsplash.com/photo-1541558869434-2840d308329a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '4',
    title: 'Business Training Course',
    description: 'Online certification in sales leadership',
    pointsCost: 2000,
    category: 'Education',
    status: 'processing',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '5',
    title: 'Marketing Budget Boost',
    description: '$500 additional marketing budget for your dealership',
    pointsCost: 4000,
    category: 'Business',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
  },
];

const RewardsPage = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>(mockRewards);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userPoints, setUserPoints] = useState(7500); // Mock user points
  const [loading, setLoading] = useState(false);

  // Filter rewards based on search and filters
  const filteredRewards = rewards.filter(reward => {
    // Apply category filter
    if (categoryFilter !== 'all' && reward.category !== categoryFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && reward.status !== statusFilter) {
      return false;
    }
    
    // Apply search term
    if (
      searchTerm &&
      !reward.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !reward.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    
    return true;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(rewards.map(reward => reward.category)));

  // Handle reward redemption
  const handleRedeemReward = (rewardId: string) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedRewards = rewards.map(reward => {
        if (reward.id === rewardId) {
          return { ...reward, status: 'processing' as const };
        }
        return reward;
      });
      
      setRewards(updatedRewards);
      // Deduct points from user
      const redeemedReward = rewards.find(r => r.id === rewardId);
      if (redeemedReward) {
        setUserPoints(prev => prev - redeemedReward.pointsCost);
      }
      
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rewards Catalog</h1>
            <p className="text-gray-600">
              Redeem your earned points for exclusive rewards and benefits.
            </p>
          </div>
          
          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg flex items-center">
            <Award className="mr-2 h-5 w-5" />
            <span className="font-medium">{userPoints.toLocaleString()} Points Available</span>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search rewards..."
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <Filter className="mr-2 h-5 w-5" />
              Filters
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>
          
          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="processing">Processing</option>
                  <option value="redeemed">Redeemed</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Rewards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.length > 0 ? (
            filteredRewards.map(reward => (
              <div key={reward.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {/* Reward image */}
                {reward.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={reward.imageUrl} 
                      alt={reward.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Reward content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{reward.title}</h3>
                    <span className="bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded">
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm text-gray-500">{reward.category}</span>
                    
                    {reward.status === 'available' ? (
                      <button
                        onClick={() => handleRedeemReward(reward.id)}
                        disabled={userPoints < reward.pointsCost || loading}
                        className={`px-3 py-1.5 rounded text-sm font-medium ${userPoints >= reward.pointsCost ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                      >
                        {loading ? 'Processing...' : 'Redeem'}
                      </button>
                    ) : reward.status === 'processing' ? (
                      <span className="flex items-center text-amber-600 text-sm">
                        <Clock className="mr-1 h-4 w-4" />
                        Processing
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600 text-sm">
                        <Check className="mr-1 h-4 w-4" />
                        Redeemed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Gift className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No rewards found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
  );
};

export default RewardsPage;