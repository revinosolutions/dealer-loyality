import React, { createContext, useContext, useState, useEffect } from 'react';

// Type definitions for our data
export type Contest = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: string;
  progress: number;
  reward: string;
  status: 'active' | 'upcoming' | 'completed';
  clientId?: string;
};

export type Leader = {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  rank: number;
  change?: number;
};

export type SalesData = {
  daily: { day: string; value: number }[];
  weekly: { week: string; value: number }[];
  monthly: { month: string; value: number }[];
};

export type StatsData = {
  totalSales: number;
  totalPoints: number;
  activeContests: number;
  pendingRewards: number;
  salesGrowth: number;
  pointsGrowth: number;
};

// Type for the data context
type DataContextType = {
  contests: Contest[];
  leaders: Leader[];
  salesData: SalesData;
  stats: StatsData;
  loading: boolean;
  fetchContests: () => Promise<void>;
  fetchLeaders: () => Promise<void>;
  fetchSalesData: () => Promise<void>;
  fetchStats: () => Promise<void>;
};

// Create the data context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const mockContests: Contest[] = [
  {
    id: '1',
    title: 'Summer Sales Challenge',
    description: 'Boost your summer sales and earn amazing rewards!',
    startDate: '2025-05-01',
    endDate: '2025-08-31',
    goal: 'Sell 100 premium units',
    progress: 65,
    reward: '$1,000 bonus + Premium Package',
    status: 'active',
  },
  {
    id: '2',
    title: 'New Product Launch',
    description: 'Help us launch our new product line successfully',
    startDate: '2025-06-15',
    endDate: '2025-07-15',
    goal: 'Demo to 50 potential customers',
    progress: 28,
    reward: 'Tech gadget bundle',
    status: 'active',
  },
  {
    id: '3',
    title: 'Q2 Performance Contest',
    description: 'Exceed your quarterly targets and win big',
    startDate: '2025-04-01',
    endDate: '2025-06-30',
    goal: 'Exceed quarterly target by 15%',
    progress: 89,
    reward: 'Vacation package',
    status: 'active',
  },
  {
    id: '4',
    title: 'Fall Feature Promotion',
    description: 'Promote our premium features to existing customers',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    goal: '30 premium upgrades',
    progress: 0,
    reward: 'Cash bonus + Recognition',
    status: 'upcoming',
  },
];

const mockLeaders: Leader[] = [
  { id: '1', name: 'John Smith', points: 4250, rank: 1, change: 0 },
  { id: '2', name: 'Sarah Johnson', points: 3875, rank: 2, change: 1 },
  { id: '3', name: 'Michael Brown', points: 3650, rank: 3, change: -1 },
  { id: '4', name: 'Emily Davis', points: 3520, rank: 4, change: 2 },
  { id: '5', name: 'Robert Wilson', points: 3480, rank: 5, change: 0 },
];

const mockSalesData: SalesData = {
  daily: [
    { day: 'Mon', value: 45 },
    { day: 'Tue', value: 60 },
    { day: 'Wed', value: 75 },
    { day: 'Thu', value: 55 },
    { day: 'Fri', value: 80 },
    { day: 'Sat', value: 65 },
    { day: 'Sun', value: 30 },
  ],
  weekly: [
    { week: 'Week 1', value: 320 },
    { week: 'Week 2', value: 380 },
    { week: 'Week 3', value: 410 },
    { week: 'Week 4', value: 390 },
  ],
  monthly: [
    { month: 'Jan', value: 1200 },
    { month: 'Feb', value: 1350 },
    { month: 'Mar', value: 1460 },
    { month: 'Apr', value: 1390 },
    { month: 'May', value: 1500 },
    { month: 'Jun', value: 1620 },
  ],
};

const mockStats: StatsData = {
  totalSales: 1245000,
  totalPoints: 85750,
  activeContests: 3,
  pendingRewards: 12,
  salesGrowth: 12.5,
  pointsGrowth: 8.3,
};

// Create data provider
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [salesData, setSalesData] = useState<SalesData>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [stats, setStats] = useState<StatsData>({
    totalSales: 0,
    totalPoints: 0,
    activeContests: 0,
    pendingRewards: 0,
    salesGrowth: 0,
    pointsGrowth:.0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch contests
  const fetchContests = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setContests(mockContests);
    } catch (error) {
      console.error('Error fetching contests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaders
  const fetchLeaders = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setLeaders(mockLeaders);
    } catch (error) {
      console.error('Error fetching leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales data
  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setSalesData(mockSalesData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchContests(),
        fetchLeaders(),
        fetchSalesData(),
        fetchStats(),
      ]);
    };

    loadData();
  }, []);

  const value = {
    contests,
    leaders,
    salesData,
    stats,
    loading,
    fetchContests,
    fetchLeaders,
    fetchSalesData,
    fetchStats,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Create hook for using data context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;