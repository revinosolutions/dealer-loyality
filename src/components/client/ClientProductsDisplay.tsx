import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, CircularProgress, Alert, Button, Tabs, Tab } from '@mui/material';
import { formatDistance } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { getClientProducts, ClientProduct } from '../../services/productsApi';
import { RefreshRounded as RefreshIcon } from '@mui/icons-material';

const ClientProductsDisplay: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchProducts = async (forceFresh = false): Promise<void> => {
    try {
      setLoading(true);
      if (forceFresh) setRefreshing(true);
      
      console.log('Fetching client products data...');
      
      if (!user) {
        console.error('No user found in auth context');
        setError('Authentication error: No user found. Please try logging in again.');
        setLoading(false);
        if (forceFresh) setRefreshing(false);
        return;
      }
      
      // Use the productsApi service
      const response = await getClientProducts();
      console.log('Client products API response:', response);
      
      // Set the products data - ensure we set empty array not null
      setProducts(response.products || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching client products:', err);
      const errorMessage = err.response ? 
        `Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}` : 
        `Network error: ${err.message || 'Failed to connect to the server'}`;
      
      console.error('Detailed error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (forceFresh) setRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = (): void => {
    fetchProducts(true);
  };

  useEffect(() => {
    if (user) {
      console.log('Current user is logged in, fetching products', { userId: user.id, role: user.role });
      fetchProducts();
    } else {
      console.log('User is not logged in, not fetching products');
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
        <Box display="flex" justifyContent="center" mt={2}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Try Again'}
          </Button>
        </Box>
      </Box>
    );
  }

  // Render products table
  const renderProductsTab = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table aria-label="client products table">
        <TableHead>
          <TableRow>
            <TableCell>Product Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Reorder Level</TableCell>
            <TableCell align="right">Purchase Date</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No products found. You don't have any approved purchase requests yet.
              </TableCell>
            </TableRow>
          ) : (
            products.map((item) => (
              <TableRow key={item.id || Math.random().toString(36)} hover>
                <TableCell component="th" scope="row">
                  {item.name || 'Unknown Product'}
                </TableCell>
                <TableCell>
                  {item.description || 'No description available'}
                </TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    color={item.stock <= item.reorderLevel ? 'error.main' : 'text.primary'}
                  >
                    {item.stock}
                  </Typography>
                </TableCell>
                <TableCell align="right">{item.reorderLevel || 5}</TableCell>
                <TableCell align="right">
                  {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : new Date(item.lastUpdated || Date.now()).toLocaleDateString()}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {formatDistance(new Date(item.purchaseDate || item.lastUpdated || Date.now()), new Date(), { addSuffix: true })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    size="small"
                    label={item.stock <= 0 ? "Out of Stock" : 
                           item.stock <= (item.reorderLevel || 5) ? "Low Stock" : "In Stock"} 
                    color={item.stock <= 0 ? "error" : 
                           item.stock <= (item.reorderLevel || 5) ? "warning" : "success"} 
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render product details
  const renderDetailsTab = () => (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        Product Details
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This tab will show detailed information about selected products.
      </Typography>
    </Box>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2 }}>
        <Typography variant="h5" gutterBottom component="div">
          My Inventory
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="inventory tabs">
          <Tab label="Current Inventory" />
          <Tab label="Product Details" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2 }}>
        {activeTab === 0 && renderProductsTab()}
        {activeTab === 1 && renderDetailsTab()}
      </Box>
    </Box>
  );
};

export default ClientProductsDisplay; 