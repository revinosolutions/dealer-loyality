import React, { useState } from 'react';
import { PlusCircle, Search, Filter, Trophy, Calendar, ChevronDown } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ContestCard from '../components/dashboard/ContestCard';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const ContestsPage = () => {
  const { user } = useAuth();
  const { contests, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('startDate');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter and sort contests
  const filteredContests = contests
    .filter(contest => {
      // Apply status filter
      if (statusFilter !== 'all' && contest.status !== statusFilter) {
        return false;
      }
      
      // Apply search term filter
      if (
        searchTerm &&
        !contest.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !contest.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected field
      if (sortBy === 'startDate') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      } else if (sortBy === 'endDate') {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'progress') {
        return b.progress - a.progress;
      }
      return 0;
    });

  return (
    <Layout title="Contests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contests</h1>
            <p className="text-gray-600">
              {user?.role === 'dealer' 
                ? 'Participate in contests to earn rewards and recognition.' 
                : 'Create and manage contests to incentivize your dealers.'}
            </p>
          </div>
          
          {(user?.role === 'super_admin' || user?.role === 'client') && (
            <a 
              href="/contests/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Contest
            </a>
          )}
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
                placeholder="Search contests..."
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
            
            {/* Sort select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="startDate">Start Date</option>
                <option value="endDate">End Date</option>
                <option value="title">Title</option>
                <option value="progress">Progress</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusFilter === 'all'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusFilter === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('upcoming')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusFilter === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusFilter === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Contest grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 h-10 w-10 rounded-lg"></div>
                    <div className="h-5 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-24 mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map(contest => (
              <ContestCard key={contest.id} {...contest} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contests found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' ? (
                'No contests match your current filters. Try adjusting your search criteria.'
              ) : user?.role === 'dealer' ? (
                'There are no contests available right now. Check back soon for new opportunities.'
              ) : (
                "You haven't created any contests yet. Create your first contest to get started."
              )}
            </p>
            {(user?.role === 'super_admin' || user?.role === 'client') && !searchTerm && statusFilter === 'all' && (
              <a 
                href="/contests/new" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Contest
              </a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ContestsPage;