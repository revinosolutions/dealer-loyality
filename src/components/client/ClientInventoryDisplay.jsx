import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Alert, Divider } from '@mui/material';
import { formatDistance } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const ClientInventoryDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        console.log('Fetching client inventory data...');
        console.log('Current user:', user);
        
        if (!user) {
          console.error('No user found in auth context');
          setError('Authentication error: No user found. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        if (user.role !== 'client' && user.role !== 'client_admin') {
          console.error(`User role ${user.role} is not authorized to view client inventory`);
          setError(`Access denied: Your role (${user.role}) does not have access to client inventory.`);
          setLoading(false);
          return;
        }

        // Add request headers with authentication token
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          }
        };
        
        console.log('Making API request to /api/client-inventory with config:', config);
        const response = await axios.get('/api/client-inventory', config);
        console.log('Client inventory API response:', response.data);
        
        if (!response.data || !response.data.products) {
          console.error('Invalid response format:', response.data);
          setError('Invalid data format received from server');
          setLoading(false);
          return;
        }
        
        setInventory(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching client inventory:', err);
        const errorMessage = err.response ? 
          `Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}` : 
          `Network error: ${err.message || 'Failed to connect to the server'}`;
        
        console.error('Detailed error:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user && (user.role === 'client' || user.role === 'client_admin')) {
      console.log('Current user is a client, fetching inventory');
      fetchInventory();
    } else {
      console.log('User is not a client, not fetching inventory', user?.role);
    }
  }, [user]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!inventory || !inventory.products || inventory.products.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No inventory items found. Approved stock will appear here after your purchase requests are approved.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4">{inventory.totalItems}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Approved Stock
              </Typography>
              <Typography variant="h4">{inventory.totalApprovedStock}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory Table */}
      <Typography variant="h6" gutterBottom>
        Your Inventory
      </Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table aria-label="client inventory table">
          <TableHead>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Reorder Level</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.products.map((product) => {
              const isLowStock = product.stock < product.reorderLevel;
              return (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell align="right">{product.stock}</TableCell>
                  <TableCell align="right">{product.reorderLevel}</TableCell>
                  <TableCell>
                    {formatDistance(new Date(product.lastUpdated), new Date(), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={isLowStock ? 'Low Stock' : 'In Stock'} 
                      color={isLowStock ? 'warning' : 'success'} 
                      size="small" 
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Approval History */}
      {inventory.approvalHistory && inventory.approvalHistory.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" gutterBottom>
            Recent Approval History
          </Typography>
          <TableContainer component={Paper} elevation={2}>
            <Table aria-label="approval history table">
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Approval Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.approvalHistory.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.productName}</TableCell>
                    <TableCell align="right">{request.quantity}</TableCell>
                    <TableCell align="right">${request.price.toFixed(2)}</TableCell>
                    <TableCell align="right">${request.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      {formatDistance(new Date(request.approvedDate), new Date(), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ClientInventoryDisplay; 