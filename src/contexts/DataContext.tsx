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
    pointsGrowth: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Get auth token
  const getAuthToken = () => localStorage.getItem('token');

  // API request helper
  const apiRequest = async (endpoint: string) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`http://localhost:5000/api${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    return response.json();
  };

  // Fetch contests
  const fetchContests = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/contests');
      setContests(data);
    } catch (error) {
      console.error('Error fetching contests:', error);
      // Fallback to mock data if API fails
      setContests(mockContests);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaders
  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/stats/leaderboard');
      setLeaders(data);
    } catch (error) {
      console.error('Error fetching leaders:', error);
      // Fallback to mock data if API fails
      setLeaders(mockLeaders);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales data
  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const daily = await apiRequest('/sales/data?period=daily');
      const weekly = await apiRequest('/sales/data?period=weekly');
      const monthly = await apiRequest('/sales/data?period=monthly');
      
      setSalesData({
        daily,
        weekly,
        monthly
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      // Fallback to mock data if API fails
      setSalesData(mockSalesData);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to mock data if API fails
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if user is authenticated
        const token = getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Load all data in parallel
        await Promise.all([
          fetchContests(),
          fetchLeaders(),
          fetchSalesData(),
          fetchStats()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Fallback to mock data
        setContests(mockContests);
        setLeaders(mockLeaders);
        setSalesData(mockSalesData);
        setStats(mockStats);
      } finally {
        setLoading(false);
      }
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