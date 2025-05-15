import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Stats {
  totalSales: number;
  totalPoints: number;
  activeContests: number;
  pendingRewards: number;
  salesGrowth: number;
  pointsGrowth: number;
}

interface Leader {
  id: string;
  name: string;
  points: number;
  rank: number;
  change: number;
}

export type Contest = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'completed';
  progress: number;
  totalParticipants: number;
  prizePool: number;
  category: string;
};

export type SalesData = {
  date: string;
  sales: number;
  points: number;
  participants: number;
};

interface DataContextType {
  stats: Stats | null;
  leaders: Leader[];
  contests: Contest[];
  salesData: SalesData[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshContests: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshSalesData: () => Promise<void>;
}

// Empty data instead of mock data
const emptyStats: Stats = {
  totalSales: 0,
  totalPoints: 0,
  activeContests: 0,
  pendingRewards: 0,
  salesGrowth: 0,
  pointsGrowth: 0,
};

const emptyLeaders: Leader[] = [];

const emptyContests: Contest[] = [];

// Generate empty sales data
const generateEmptySalesData = (): SalesData[] => {
  return [];
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [leaders, setLeaders] = useState<Leader[]>(emptyLeaders);
  const [contests, setContests] = useState<Contest[]>(emptyContests);
  const [salesData, setSalesData] = useState<SalesData[]>(generateEmptySalesData());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = async () => {
    try {
      setStats(emptyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  };

  const refreshContests = async () => {
    try {
      setContests(emptyContests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contests');
    }
  };

  const refreshLeaderboard = async () => {
    try {
      setLeaders(emptyLeaders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    }
  };

  const refreshSalesData = async () => {
    try {
      setSalesData(generateEmptySalesData());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshStats(),
        refreshContests(),
        refreshLeaderboard(),
        refreshSalesData(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load - only refresh if needed
  useEffect(() => {
    if (user && (!stats || !leaders.length || !contests.length || !salesData.length)) {
      refreshData();
    }
  }, [user]);

  const value = {
    stats,
    leaders,
    contests,
    salesData,
    loading: isLoading,
    error,
    refreshData,
    refreshStats,
    refreshContests,
    refreshLeaderboard,
    refreshSalesData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;