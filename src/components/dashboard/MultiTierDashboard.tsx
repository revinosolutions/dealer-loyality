import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  useMediaQuery,
  Theme
} from '@mui/material';
import ErrorBoundary from '../common/ErrorBoundary';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  Award, 
  AlertTriangle,
  RefreshCw,
  Eye,
  ShoppingCart,
  BarChart2,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

interface DashboardMetric {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface SalesSummary {
  period: string;
  revenue: number;
  units: number;
  growth: number;
}

interface RewardSummary {
  pointsBalance: number;
  pointsEarned: number;
  availableRewards: number;
  recentRedemptions: number;
}

const MultiTierDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { stats, loading } = useData();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(false);
  const [loadingSales, setLoadingSales] = useState<boolean>(false);
  const [loadingRewards, setLoadingRewards] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Determine role-specific metrics
  const getRoleSpecificMetrics = (): DashboardMetric[] => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case 'super_admin':
        return [
          {
            title: 'Total Revenue',
            value: formatCurrency(stats?.totalRevenue || 0),
            change: stats?.revenueGrowth || 0,
            icon: <DollarSign size={20} />,
            color: 'bg-green-500'
          },
          {
            title: 'Active Clients',
            value: stats?.activeClients || 0,
            change: stats?.clientGrowth || 0,
            icon: <Users size={20} />,
            color: 'bg-blue-500'
          },
          {
            title: 'Total Inventory',
            value: stats?.totalInventory || 0,
            change: stats?.inventoryGrowth || 0,
            icon: <Package size={20} />,
            color: 'bg-purple-500'
          },
          {
            title: 'System Health',
            value: `${stats?.systemHealth || 100}%`,
            change: 0,
            icon: <TrendingUp size={20} />,
            color: 'bg-indigo-500'
          }
        ];
      case 'client':
        return [
          {
            title: 'Client Revenue',
            value: formatCurrency(stats?.clientRevenue || 0),
            change: stats?.clientRevenueGrowth || 0,
            icon: <DollarSign size={20} />,
            color: 'bg-green-500'
          },
          {
            title: 'Active Dealers',
            value: stats?.activeDealers || 0,
            change: stats?.dealerGrowth || 0,
            icon: <Users size={20} />,
            color: 'bg-blue-500'
          },
          {
            title: 'Available Inventory',
            value: stats?.availableInventory || 0,
            change: stats?.inventoryChange || 0,
            icon: <Package size={20} />,
            color: 'bg-purple-500'
          },
          {
            title: 'Reward Points',
            value: stats?.clientPoints || 0,
            change: stats?.pointsGrowth || 0,
            icon: <Award size={20} />,
            color: 'bg-amber-500'
          }
        ];
      case 'dealer':
        return [
          {
            title: 'Dealer Sales',
            value: formatCurrency(stats?.dealerSales || 0),
            change: stats?.salesGrowth || 0,
            icon: <DollarSign size={20} />,
            color: 'bg-green-500'
          },
          {
            title: 'Units Sold',
            value: stats?.unitsSold || 0,
            change: stats?.unitsGrowth || 0,
            icon: <ShoppingCart size={20} />,
            color: 'bg-blue-500'
          },
          {
            title: 'Inventory Level',
            value: stats?.dealerInventory || 0,
            change: stats?.inventoryChange || 0,
            icon: <Package size={20} />,
            color: 'bg-purple-500'
          },
          {
            title: 'Reward Points',
            value: stats?.dealerPoints || 0,
            change: stats?.pointsGrowth || 0,
            icon: <Award size={20} />,
            color: 'bg-amber-500'
          }
        ];
      default:
        return [];
    }
  };

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Data fetching functions with proper error handling
  const fetchInventoryData = async () => {
    setLoadingInventory(true);
    setError(null);
    try {
      // In production, this would be an API call
      // Using Promise with timeout to simulate API call with proper error handling
      const inventoryPromise = new Promise<InventoryItem[]>((resolve, reject) => {
        setTimeout(() => {
          // Empty inventory data - removed mock data
          const mockInventory: InventoryItem[] = [];
          // Simulate successful API response
          resolve(mockInventory);
          // Uncomment to test error handling
          // reject(new Error('Network error'));
        }, 1000);
      });
      
      const data = await inventoryPromise;
      setInventoryItems(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError(`Failed to load inventory data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchSalesData = async () => {
    setLoadingSales(true);
    setError(null);
    try {
      // In production, this would be an API call
      const salesPromise = new Promise<SalesSummary>((resolve, reject) => {
        setTimeout(() => {
          // Mock sales summary
          const mockSalesSummary: SalesSummary = {
            period: 'This Month',
            revenue: 1250000,
            units: 350,
            growth: 12.5
          };
          // Simulate successful API response
          resolve(mockSalesSummary);
          // Uncomment to test error handling
          // reject(new Error('Network error'));
        }, 800);
      });
      
      const data = await salesPromise;
      setSalesSummary(data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError(`Failed to load sales data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchRewardsData = async () => {
    setLoadingRewards(true);
    setError(null);
    try {
      // In production, this would be an API call
      const rewardsPromise = new Promise<RewardSummary>((resolve, reject) => {
        setTimeout(() => {
          // Mock rewards summary
          const mockRewardSummary: RewardSummary = {
            pointsBalance: 12500,
            pointsEarned: 2500,
            availableRewards: 15,
            recentRedemptions: 3
          };
          // Simulate successful API response
          resolve(mockRewardSummary);
          // Uncomment to test error handling
          // reject(new Error('Network error'));
        }, 600);
      });
      
      const data = await rewardsPromise;
      setRewardSummary(data);
    } catch (error) {
      console.error('Error fetching rewards data:', error);
      setError(`Failed to load rewards data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoadingRewards(false);
    }
  };

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'inventory') {
      fetchInventoryData();
    }
    if (activeTab === 'overview' || activeTab === 'sales') {
      fetchSalesData();
    }
    if (activeTab === 'overview' || activeTab === 'rewards') {
      fetchRewardsData();
    }
  }, [activeTab]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // Render inventory status chip
  const renderStatusChip = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Chip label="In Stock" color="success" size="small" />;
      case 'low_stock':
        return <Chip label="Low Stock" color="warning" size="small" />;
      case 'out_of_stock':
        return <Chip label="Out of Stock" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if the screen is mobile size
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  // Memoize the metrics to prevent unnecessary re-renders
  const roleSpecificMetrics = useCallback(getRoleSpecificMetrics, [currentUser, stats]);

  return (
    <ErrorBoundary>
      <Box className="space-y-6">
        {/* Metrics Overview */}
        <Grid container spacing={isMobile ? 2 : 3}>
          {roleSpecificMetrics().map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card className="h-full" elevation={1} sx={{ transition: 'all 0.2s ease-in-out', '&:hover': { boxShadow: 3 } }}>
                <CardContent>
                  <Box className="flex items-center justify-between mb-2">
                    <Typography variant="subtitle2" color="text.secondary">
                      {metric.title}
                    </Typography>
                    <Box className={`w-8 h-8 rounded-full ${metric.color} flex items-center justify-center text-white`}>
                      {metric.icon}
                    </Box>
                  </Box>
                  <Typography variant="h5" component="div">
                    {metric.value}
                  </Typography>
                  <Box className="flex items-center mt-1">
                    {metric.change > 0 ? (
                      <Typography variant="caption" className="flex items-center text-green-600">
                        <TrendingUp size={14} className="mr-1" />
                        {metric.change}%
                      </Typography>
                    ) : metric.change < 0 ? (
                      <Typography variant="caption" className="flex items-center text-red-600">
                        <TrendingUp size={14} className="mr-1 transform rotate-180" />
                        {Math.abs(metric.change)}%
                      </Typography>
                    ) : (
                      <Typography variant="caption" className="text-gray-500">
                        No change
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      vs last period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: isMobile ? 'auto' : 'visible' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="dashboard tabs"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : undefined}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Inventory" value="inventory" />
          <Tab label="Sales" value="sales" />
          <Tab label="Rewards" value="rewards" />
        </Tabs>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => {
                if (activeTab === 'overview') {
                  fetchInventoryData();
                  fetchSalesData();
                  fetchRewardsData();
                } else if (activeTab === 'inventory') {
                  fetchInventoryData();
                } else if (activeTab === 'sales') {
                  fetchSalesData();
                } else if (activeTab === 'rewards') {
                  fetchRewardsData();
                }
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Tab Content */}
      <Box className="mt-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Grid container spacing={4}>
            {/* Inventory Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Inventory Summary</Typography>
                    <Tooltip title="Refresh Inventory Data">
                      <IconButton size="small" onClick={fetchInventoryData} disabled={loadingInventory}>
                        {loadingInventory ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {loadingInventory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <>
                      <Box className="flex justify-between mb-2">
                        <Typography variant="body2" color="text.secondary">
                          Total Products
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {inventoryItems.length}
                        </Typography>
                      </Box>
                      <Box className="flex justify-between mb-2">
                        <Typography variant="body2" color="text.secondary">
                          Low Stock Items
                        </Typography>
                        <Typography variant="body1" fontWeight="medium" className="text-amber-500">
                          {inventoryItems.filter(item => item.status === 'low_stock').length}
                        </Typography>
                      </Box>
                      <Box className="flex justify-between mb-4">
                        <Typography variant="body2" color="text.secondary">
                          Out of Stock Items
                        </Typography>
                        <Typography variant="body1" fontWeight="medium" className="text-red-500">
                          {inventoryItems.filter(item => item.status === 'out_of_stock').length}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Box className="mt-2">
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<Eye size={16} />}
                          onClick={() => setActiveTab('inventory')}
                        >
                          View Inventory Details
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sales Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Sales Summary</Typography>
                    <Tooltip title="Refresh Sales Data">
                      <IconButton size="small" onClick={fetchSalesData} disabled={loadingSales}>
                        {loadingSales ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {loadingSales ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : salesSummary ? (
                    <>
                      <Box className="flex justify-between mb-2">
                        <Typography variant="body2" color="text.secondary">
                          Period
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {salesSummary.period}
                        </Typography>
                      </Box>
                      <Box className="flex justify-between mb-2">
                        <Typography variant="body2" color="text.secondary">
                          Revenue
                        </Typography>
                        <Typography variant="body1" fontWeight="medium" className="text-green-600">
                          {formatCurrency(salesSummary.revenue)}
                        </Typography>
                      </Box>
                      <Box className="flex justify-between mb-2">
                        <Typography variant="body2" color="text.secondary">
                          Units Sold
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {salesSummary.units}
                        </Typography>
                      </Box>
                      <Box className="flex justify-between mb-4">
                        <Typography variant="body2" color="text.secondary">
                          Growth
                        </Typography>
                        <Typography 
                          variant="body1" 
                          fontWeight="medium"
                          className={salesSummary.growth >= 0 ? 'text-green-600' : 'text-red-600'}
                        >
                          {salesSummary.growth}%
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Box className="mt-2">
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<BarChart2 size={16} />}
                          onClick={() => setActiveTab('sales')}
                        >
                          View Sales Analytics
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No sales data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Rewards Summary */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Rewards Program</Typography>
                    <Tooltip title="Refresh Rewards Data">
                      <IconButton size="small" onClick={fetchRewardsData} disabled={loadingRewards}>
                        {loadingRewards ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {loadingRewards ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : rewardSummary ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-gray-50 rounded-lg">
                          <Typography variant="h4" className="text-indigo-600 font-bold">
                            {rewardSummary.pointsBalance.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Points Balance
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-gray-50 rounded-lg">
                          <Typography variant="h4" className="text-green-600 font-bold">
                            +{rewardSummary.pointsEarned.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Points Earned (30 days)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-gray-50 rounded-lg">
                          <Typography variant="h4" className="text-amber-600 font-bold">
                            {rewardSummary.availableRewards}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Available Rewards
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-gray-50 rounded-lg">
                          <Typography variant="h4" className="text-blue-600 font-bold">
                            {rewardSummary.recentRedemptions}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Recent Redemptions
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box className="mt-2 flex justify-center">
                          <Button 
                            variant="contained" 
                            color="primary"
                            startIcon={<Award size={16} />}
                            onClick={() => setActiveTab('rewards')}
                          >
                            Explore Rewards
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No rewards data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <Grid container spacing={3}>
            {/* Inventory Summary */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Inventory Management</Typography>
                    <Box className="flex gap-2">
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<RefreshCw size={16} />}
                        onClick={fetchInventoryData}
                        disabled={loadingInventory}
                      >
                        Refresh
                      </Button>
                      {currentUser?.role !== 'dealer' && (
                        <Button 
                          variant="contained" 
                          size="small"
                          color="primary"
                        >
                          Manage Inventory
                        </Button>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Inventory Stats */}
                  {!loadingInventory && inventoryItems.length > 0 && (
                    <Grid container spacing={3} className="mb-4">
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-blue-50 rounded-lg">
                          <Typography variant="h4" className="text-blue-600 font-bold">
                            {inventoryItems.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Products
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-green-50 rounded-lg">
                          <Typography variant="h4" className="text-green-600 font-bold">
                            {inventoryItems.filter(item => item.status === 'in_stock').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            In Stock Items
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-amber-50 rounded-lg">
                          <Typography variant="h4" className="text-amber-600 font-bold">
                            {inventoryItems.filter(item => item.status === 'low_stock').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Low Stock Items
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-3 bg-red-50 rounded-lg">
                          <Typography variant="h4" className="text-red-600 font-bold">
                            {inventoryItems.filter(item => item.status === 'out_of_stock').length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Out of Stock Items
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                  
                  {/* Inventory Filters */}
                  {!loadingInventory && inventoryItems.length > 0 && (
                    <Box className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                      <Box className="flex items-center">
                        <Typography variant="body2" className="mr-2">Filter by:</Typography>
                      </Box>
                      <Button 
                        variant="outlined" 
                        size="small"
                        className="rounded-full"
                      >
                        All Items
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        className="rounded-full"
                        color="success"
                      >
                        In Stock
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        className="rounded-full"
                        color="warning"
                      >
                        Low Stock
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        className="rounded-full"
                        color="error"
                      >
                        Out of Stock
                      </Button>
                      <Box className="flex-grow"></Box>
                      <Button 
                        variant="text" 
                        size="small"
                        startIcon={<Package size={16} />}
                      >
                        Export Inventory
                      </Button>
                    </Box>
                  )}
                  
                  {/* Inventory Table */}
                  {loadingInventory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : inventoryItems.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table sx={{ minWidth: 650 }} size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product Name</TableCell>
                            <TableCell>SKU</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Current Stock</TableCell>
                            <TableCell align="right">Reorder Level</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventoryItems.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell component="th" scope="row">
                                <Typography variant="body2" fontWeight="medium">{item.name}</Typography>
                              </TableCell>
                              <TableCell>{item.sku}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={item.category} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  className={item.currentStock <= item.reorderLevel ? 'text-red-600 font-medium' : ''}
                                >
                                  {item.currentStock}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{item.reorderLevel}</TableCell>
                              <TableCell>{renderStatusChip(item.status)}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="View Details">
                                  <IconButton size="small">
                                    <Eye size={16} />
                                  </IconButton>
                                </Tooltip>
                                {item.status === 'low_stock' && (
                                  <Tooltip title="Reorder">
                                    <IconButton size="small" color="warning">
                                      <ShoppingCart size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {item.status === 'out_of_stock' && (
                                  <Tooltip title="Out of Stock">
                                    <IconButton size="small" color="error">
                                      <AlertTriangle size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      No inventory items found. {currentUser?.role !== 'dealer' && 'Add products to your inventory.'}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Inventory Distribution */}
            {!loadingInventory && inventoryItems.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Inventory by Category</Typography>
                    
                    {/* Mock chart - in a real app, use a charting library like recharts */}
                    <Box className="h-64 border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                      <Typography variant="body2" color="text.secondary">
                        No data available
                      </Typography>
                    </Box>
                    
                    <Box className="mt-4">
                      <Typography variant="subtitle2" gutterBottom>Category Distribution</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Premium and Standard categories make up the majority of your inventory. Consider diversifying your product mix for better market coverage.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            {/* Inventory Alerts */}
            {!loadingInventory && inventoryItems.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Inventory Alerts</Typography>
                    
                    {inventoryItems.filter(item => item.status !== 'in_stock').length > 0 ? (
                      <Box>
                        {inventoryItems
                          .filter(item => item.status !== 'in_stock')
                          .map((item) => (
                            <Box key={item.id} className="mb-3 p-3 border border-gray-200 rounded-lg">
                              <Box className="flex justify-between items-start">
                                <Typography variant="body1" fontWeight="medium">
                                  {item.name}
                                </Typography>
                                {renderStatusChip(item.status)}
                              </Box>
                              <Box className="flex justify-between mt-2">
                                <Typography variant="body2" color="text.secondary">
                                  Current: {item.currentStock} | Reorder at: {item.reorderLevel}
                                </Typography>
                                <Button 
                                  variant="text" 
                                  size="small" 
                                  color="primary"
                                  startIcon={<ShoppingCart size={14} />}
                                >
                                  Reorder
                                </Button>
                              </Box>
                            </Box>
                          ))
                        }
                      </Box>
                    ) : (
                      <Alert severity="success" className="mt-2">
                        All inventory items are adequately stocked.
                      </Alert>
                    )}
                    
                    {/* Inventory recommendations */}
                    <Box className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <Typography variant="subtitle2" gutterBottom>Inventory Recommendations</Typography>
                      <Typography variant="body2" paragraph>
                        Based on recent sales trends, consider increasing stock levels for Premium Model X and Luxury Model A to meet growing demand.
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        color="primary"
                      >
                        View Detailed Analysis
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            {/* Role-specific inventory management */}
            {currentUser?.role !== 'dealer' && !loadingInventory && inventoryItems.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {currentUser?.role === 'super_admin' ? 'Inventory Distribution' : 'Dealer Inventory Allocation'}
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>{currentUser?.role === 'super_admin' ? 'Client' : 'Dealer'}</TableCell>
                            <TableCell align="right">Total Inventory</TableCell>
                            <TableCell align="right">Low Stock Items</TableCell>
                            <TableCell align="right">Out of Stock Items</TableCell>
                            <TableCell align="right">Inventory Value</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Removed mock inventory distribution data */}
                          {[].map((entity) => (
                            <TableRow key={entity.id} hover>
                              <TableCell>{entity.name}</TableCell>
                              <TableCell align="right">{entity.total}</TableCell>
                              <TableCell align="right">
                                <Typography className="text-amber-600">
                                  {entity.lowStock}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography className="text-red-600">
                                  {entity.outOfStock}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(entity.value)}</TableCell>
                              <TableCell align="right">
                                <Button 
                                  variant="text" 
                                  size="small" 
                                  color="primary"
                                >
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <Grid container spacing={3}>
            {/* Sales Summary Card */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Sales Performance</Typography>
                    <Tooltip title="Refresh Sales Data">
                      <IconButton size="small" onClick={fetchSalesData} disabled={loadingSales}>
                        {loadingSales ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {loadingSales ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : salesSummary ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <Box className="text-center p-4 bg-green-50 rounded-lg">
                          <Typography variant="h4" className="text-green-600 font-bold">
                            {formatCurrency(salesSummary.revenue)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Revenue
                          </Typography>
                          <Box className="flex items-center justify-center mt-1">
                            {salesSummary.growth >= 0 ? (
                              <Typography variant="caption" className="flex items-center text-green-600">
                                <TrendingUp size={14} className="mr-1" />
                                {salesSummary.growth}%
                              </Typography>
                            ) : (
                              <Typography variant="caption" className="flex items-center text-red-600">
                                <TrendingUp size={14} className="mr-1 transform rotate-180" />
                                {Math.abs(salesSummary.growth)}%
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box className="text-center p-4 bg-blue-50 rounded-lg">
                          <Typography variant="h4" className="text-blue-600 font-bold">
                            {salesSummary.units.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Units Sold
                          </Typography>
                          <Box className="flex items-center justify-center mt-1">
                            <Typography variant="caption" color="text.secondary">
                              {salesSummary.period}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box className="text-center p-4 bg-purple-50 rounded-lg">
                          <Typography variant="h4" className="text-purple-600 font-bold">
                            {formatCurrency(salesSummary.revenue / salesSummary.units)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Avg. Per Unit
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box className="text-center p-4 bg-amber-50 rounded-lg">
                          <Typography variant="h4" className="text-amber-600 font-bold">
                            {currentUser?.role === 'dealer' ? '250' : currentUser?.role === 'client' ? '1,250' : '5,000'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Points Earned
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info">No sales data available</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Sales Chart */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Sales Trend</Typography>
                  
                  {loadingSales ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {/* Period selector */}
                      <Box className="flex justify-end mb-4">
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ChevronDown size={16} />}
                        >
                          {salesSummary?.period || 'This Month'}
                        </Button>
                      </Box>
                      
                      {/* Mock chart - in a real app, use a charting library like recharts */}
                      <Box className="h-64 border border-gray-200 rounded-lg p-4">
                        <Box className="h-full items-end gap-2">
                          {/* Mock data for chart bars */}
                          {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((label, index) => {
                            // Generate random heights for the bars
                            const heights = [75, 85, 65, 90];
                            const prevHeights = [70, 75, 70, 80];
                            return (
                              <Box key={index} className="flex-1 flex flex-col items-center">
                                <Box className="w-full h-full flex items-end justify-center relative">
                                  {/* Previous period bar (lighter color) */}
                                  <Box 
                                    className="w-5 bg-indigo-200 rounded-t-sm absolute left-1/2 -ml-6"
                                    style={{ height: `${prevHeights[index]}%` }}
                                  ></Box>
                                  
                                  {/* Current period bar */}
                                  <Box 
                                    className="w-5 bg-indigo-600 rounded-t-sm absolute left-1/2 -ml-2.5"
                                    style={{ height: `${heights[index]}%` }}
                                  ></Box>
                                </Box>
                                <Box className="mt-2 text-xs text-gray-600">{label}</Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                      
                      <Box className="flex justify-between mt-4 text-sm text-gray-500">
                        <Box className="flex items-center">
                          <Box className="w-3 h-3 bg-indigo-600 rounded-sm mr-1"></Box>
                          <span>Current Period</span>
                        </Box>
                        <Box className="flex items-center">
                          <Box className="w-3 h-3 bg-indigo-200 rounded-sm mr-1"></Box>
                          <span>Previous Period</span>
                        </Box>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Top Products */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Top Products</Typography>
                  
                  {loadingSales ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {/* Mock top products - would come from API in real implementation */}
                      {[
                        { id: '1', name: 'Premium Model X', units: 45, revenue: 225000, growth: 12 },
                        { id: '2', name: 'Standard Model Y', units: 38, revenue: 133000, growth: 8 },
                        { id: '3', name: 'Luxury Model A', units: 22, revenue: 198000, growth: 15 },
                        { id: '4', name: 'Economy Model Z', units: 56, revenue: 112000, growth: -3 }
                      ].map((product) => (
                        <Box key={product.id} className="mb-3 p-3 border border-gray-200 rounded-lg">
                          <Box className="flex justify-between items-start">
                            <Typography variant="body1" fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Chip 
                              label={formatCurrency(product.revenue)} 
                              color="primary" 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                          <Box className="flex justify-between mt-2">
                            <Typography variant="body2" color="text.secondary">
                              {product.units} units
                            </Typography>
                            <Typography 
                              variant="body2" 
                              className={product.growth >= 0 ? 'text-green-600' : 'text-red-600'}
                            >
                              {product.growth >= 0 ? '+' : ''}{product.growth}%
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Recent Sales Table */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Recent Sales</Typography>
                    <Button 
                      variant="text" 
                      color="primary"
                      endIcon={<ArrowRight size={16} />}
                    >
                      View All Sales
                    </Button>
                  </Box>
                  
                  {loadingSales ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Product</TableCell>
                            {currentUser?.role !== 'dealer' && <TableCell>Dealer</TableCell>}
                            {currentUser?.role === 'super_admin' && <TableCell>Client</TableCell>}
                            <TableCell align="right">Units</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                            <TableCell align="right">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Empty array - removed mock sales data */}
                          {[].map((sale) => (
                            <TableRow key={sale.id} hover>
                              <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                              <TableCell>{sale.product}</TableCell>
                              {currentUser?.role !== 'dealer' && <TableCell>{sale.dealer}</TableCell>}
                              {currentUser?.role === 'super_admin' && <TableCell>{sale.client}</TableCell>}
                              <TableCell align="right">{sale.units}</TableCell>
                              <TableCell align="right">{formatCurrency(sale.revenue)}</TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label={sale.status} 
                                  color="success" 
                                  size="small" 
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Role-specific sales analytics */}
            {currentUser?.role !== 'dealer' && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {currentUser?.role === 'super_admin' ? 'Client Performance' : 'Dealer Performance'}
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>{currentUser?.role === 'super_admin' ? 'Client' : 'Dealer'}</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                            <TableCell align="right">Units</TableCell>
                            <TableCell align="right">Growth</TableCell>
                            <TableCell align="right">Points Earned</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Removed mock performance data and replaced with empty array */}
                          {[].map((entity) => (
                            <TableRow key={entity.id} hover>
                              <TableCell>{entity.name}</TableCell>
                              <TableCell align="right">{formatCurrency(entity.revenue)}</TableCell>
                              <TableCell align="right">{entity.units}</TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  className={entity.growth >= 0 ? 'text-green-600' : 'text-red-600'}
                                >
                                  {entity.growth >= 0 ? '+' : ''}{entity.growth}%
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{entity.points.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <Grid container spacing={3}>
            {/* Rewards Summary Card */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box className="flex justify-between items-center mb-4">
                    <Typography variant="h6">Rewards Summary</Typography>
                    <Tooltip title="Refresh Rewards Data">
                      <IconButton size="small" onClick={fetchRewardsData} disabled={loadingRewards}>
                        {loadingRewards ? <CircularProgress size={20} /> : <RefreshCw size={20} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {loadingRewards ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : rewardSummary ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-4 bg-indigo-50 rounded-lg">
                          <Typography variant="h4" className="text-indigo-600 font-bold">
                            {rewardSummary.pointsBalance.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Points Balance
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-4 bg-green-50 rounded-lg">
                          <Typography variant="h4" className="text-green-600 font-bold">
                            +{rewardSummary.pointsEarned.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Points Earned (30 days)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-4 bg-amber-50 rounded-lg">
                          <Typography variant="h4" className="text-amber-600 font-bold">
                            {rewardSummary.availableRewards}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Available Rewards
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box className="text-center p-4 bg-blue-50 rounded-lg">
                          <Typography variant="h4" className="text-blue-600 font-bold">
                            {rewardSummary.recentRedemptions}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Recent Redemptions
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info">No rewards data available</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Available Rewards */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Available Rewards</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Redeem your points for these exclusive rewards
                  </Typography>
                  
                  {loadingRewards ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>Reward</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Points Required</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Mock rewards data - would come from API in real implementation */}
                          {[
                            { id: '1', name: 'Premium Merchandise', description: 'Exclusive branded merchandise', points: 5000, available: true },
                            { id: '2', name: 'Sales Bonus', description: 'Additional commission on next sale', points: 10000, available: true },
                            { id: '3', name: 'VIP Event Access', description: 'Access to exclusive industry events', points: 15000, available: true },
                            { id: '4', name: 'Training Workshop', description: 'Advanced sales training workshop', points: 7500, available: true },
                            { id: '5', name: 'Marketing Support', description: 'Dedicated marketing campaign support', points: 20000, available: currentUser?.role === 'dealer' }
                          ].map((reward) => (
                            <TableRow key={reward.id} hover>
                              <TableCell component="th" scope="row">
                                <Typography variant="body1" fontWeight="medium">{reward.name}</Typography>
                              </TableCell>
                              <TableCell>{reward.description}</TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label={reward.points.toLocaleString()} 
                                  color="primary" 
                                  variant="outlined" 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  color="primary"
                                  disabled={!reward.available || (rewardSummary && rewardSummary.pointsBalance < reward.points)}
                                >
                                  Redeem
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Redemption History */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Redemption History</Typography>
                  
                  {loadingRewards ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {/* Mock redemption history - would come from API in real implementation */}
                      {[
                        { id: '1', reward: 'Premium Merchandise', date: '2025-05-15', points: 5000 },
                        { id: '2', reward: 'Sales Bonus', date: '2025-04-22', points: 10000 },
                        { id: '3', reward: 'Training Workshop', date: '2025-03-10', points: 7500 }
                      ].map((redemption) => (
                        <Box key={redemption.id} className="mb-3 p-3 border border-gray-200 rounded-lg">
                          <Box className="flex justify-between items-start">
                            <Typography variant="body1" fontWeight="medium">
                              {redemption.reward}
                            </Typography>
                            <Chip 
                              label={`-${redemption.points.toLocaleString()}`} 
                              color="secondary" 
                              size="small" 
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Redeemed on {new Date(redemption.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                      
                      {/* View all link */}
                      <Box className="mt-3 text-center">
                        <Button 
                          variant="text" 
                          color="primary"
                          size="small"
                        >
                          View All History
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Role-specific rewards information */}
            {currentUser?.role !== 'dealer' && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {currentUser?.role === 'super_admin' ? 'Rewards Program Management' : 'Dealer Rewards Program'}
                    </Typography>
                    
                    <Box className="p-4 bg-blue-50 rounded-lg mb-4">
                      <Typography variant="body1" paragraph>
                        {currentUser?.role === 'super_admin' 
                          ? 'Manage the rewards program across all clients and dealers. Configure point values, create new rewards, and track redemption analytics.'
                          : 'Monitor your dealers\'s rewards program engagement. View point accumulation trends and popular redemption options.'}
                      </Typography>
                      
                      <Button 
                        variant="contained" 
                        color="primary"
                      >
                        {currentUser?.role === 'super_admin' ? 'Manage Rewards Program' : 'View Dealer Rewards Analytics'}
                      </Button>
                    </Box>
                    
                    {currentUser?.role === 'client' && (
                      <Box className="mt-4">
                        <Typography variant="subtitle1" gutterBottom>Top Performing Dealers</Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Dealer</TableCell>
                                <TableCell align="right">Points Earned</TableCell>
                                <TableCell align="right">Redemptions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {/* Mock top dealers data */}
                              {[
                                
                              ].map((dealer) => (
                                <TableRow key={dealer.id} hover>
                                  <TableCell>{dealer.name}</TableCell>
                                  <TableCell align="right">{dealer.pointsEarned.toLocaleString()}</TableCell>
                                  <TableCell align="right">{dealer.redemptions}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Box>
    </ErrorBoundary>
  );
};

export default MultiTierDashboard;