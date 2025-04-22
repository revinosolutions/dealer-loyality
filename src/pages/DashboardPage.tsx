import React, { useEffect, useState } from 'react';
import { Trophy, Users, BarChart3, Gift } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/dashboard/StatCard';
import SalesChart from '../components/dashboard/SalesChart';
import ContestCard from '../components/dashboard/ContestCard';
import LeaderboardCard from '../components/dashboard/LeaderboardCard';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const { contests, leaders, stats, loading } = useData();
  const [activeContests, setActiveContests] = useState([]);

  useEffect(() => {
    // Filter active contests
    setActiveContests(contests.filter(contest => contest.status === 'active'));
  }, [contests]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Layout title="Dashboard">
      <div className="grid gap-6">
        {/* Welcome message */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your {user?.role === 'dealer' ? 'performance' : 'programs'} today.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            change={stats.salesGrowth}
            icon={<BarChart3 size={22} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            isLoading={loading}
          />
          <StatCard
            title="Loyalty Points"
            value={stats.totalPoints.toLocaleString()}
            change={stats.pointsGrowth}
            icon={<Gift size={22} />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            isLoading={loading}
          />
          <StatCard
            title="Active Contests"
            value={stats.activeContests}
            icon={<Trophy size={22} />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            isLoading={loading}
          />
          <StatCard
            title={user?.role === 'dealer' ? 'Available Rewards' : 'Enrolled Dealers'}
            value={user?.role === 'dealer' ? stats.pendingRewards : '42'}
            icon={<Users size={22} />}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            isLoading={loading}
          />
        </div>

        {/* Charts and contests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales chart - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <SalesChart isLoading={loading} />
          </div>
          
          {/* Leaderboard */}
          <div>
            <LeaderboardCard 
              title="Top Performers" 
              leaders={leaders.slice(0, 5)}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Active contests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Active Contests</h2>
            <a 
              href="/contests" 
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View all contests
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
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
              ))
            ) : activeContests.length > 0 ? (
              activeContests.map((contest) => (
                <ContestCard key={contest.id} {...contest} />
              ))
            ) : (
              <div className="lg:col-span-3 bg-gray-50 rounded-xl p-8 text-center">
                <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active contests</h3>
                <p className="text-gray-600 mb-6">
                  {user?.role === 'super_admin' || user?.role === 'client' 
                    ? "You don't have any active contests right now. Create a new contest to engage your dealers." 
                    : "There are no active contests right now. Check back soon for new opportunities."}
                </p>
                {(user?.role === 'super_admin' || user?.role === 'client') && (
                  <a 
                    href="/contests/new" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create New Contest
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;