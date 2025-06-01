import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Alert, Divider, Button, Tabs, Tab } from '@mui/material';
import { Gift, Award, Clock, TrendingUp } from 'react-feather';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistance, format } from 'date-fns';

const LoyaltyPointsDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        setLoading(true);
        console.log('Fetching loyalty points data...');
        
        if (!user) {
          console.error('No user found in auth context');
          setError('Authentication error: No user found. Please try logging in again.');
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
        
        // Fetch balance
        console.log('Making API request to /api/loyalty/balance');
        const balanceResponse = await axios.get('/api/loyalty/balance', config);
        console.log('Loyalty balance API response:', balanceResponse.data);
        
        if (!balanceResponse.data || !balanceResponse.data.success) {
          console.error('Invalid response format:', balanceResponse.data);
          setError('Invalid data format received from server');
          setLoading(false);
          return;
        }
        
        setBalance(balanceResponse.data);
        
        // Fetch transaction history
        console.log('Making API request to /api/loyalty/history');
        const historyResponse = await axios.get('/api/loyalty/history', config);
        console.log('Loyalty history API response:', historyResponse.data);
        
        if (historyResponse.data && historyResponse.data.transactions) {
          setTransactions(historyResponse.data.transactions);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching loyalty data:', err);
        const errorMessage = err.response ? 
          `Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}` : 
          `Network error: ${err.message || 'Failed to connect to the server'}`;
        
        console.error('Detailed error:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      console.log('Current user is logged in, fetching loyalty data');
      fetchLoyaltyData();
    } else {
      console.log('User is not logged in, not fetching loyalty data');
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earned':
        return <TrendingUp size={16} color="#4caf50" />;
      case 'redeemed':
        return <Gift size={16} color="#f44336" />;
      case 'expired':
        return <Clock size={16} color="#ff9800" />;
      case 'adjusted':
        return <Award size={16} color="#2196f3" />;
      default:
        return <Award size={16} color="#9e9e9e" />;
    }
  };

  const formatTransactionType = (type) => {
    switch (type) {
      case 'earned':
        return 'Earned';
      case 'redeemed':
        return 'Redeemed';
      case 'expired':
        return 'Expired';
      case 'adjusted':
        return 'Adjusted';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
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
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!balance) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No loyalty points data found. Points will be awarded when you purchase products.
      </Alert>
    );
  }

  const renderBalance = () => (
    <>
      {/* Points Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography color="white" variant="subtitle1" gutterBottom>
                  Available Points
                </Typography>
                <Award size={24} color="white" />
              </Box>
              <Typography variant="h3" sx={{ mt: 2 }}>
                {balance.points.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Updated {formatDistance(new Date(balance.lastUpdated), new Date(), { addSuffix: true })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography color="textSecondary" variant="subtitle1" gutterBottom>
                  Total Earned
                </Typography>
                <TrendingUp size={24} className="text-green-500" />
              </Box>
              <Typography variant="h4">
                {balance.totalEarned.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Lifetime points earned
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography color="textSecondary" variant="subtitle1" gutterBottom>
                  Total Redeemed
                </Typography>
                <Gift size={24} className="text-red-500" />
              </Box>
              <Typography variant="h4">
                {balance.totalRedeemed.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Lifetime points redeemed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Points Redemption Info */}
      <Card elevation={1} sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How to Use Your Points
          </Typography>
          <Typography variant="body2" paragraph>
            Your loyalty points can be redeemed for various rewards and discounts on future purchases.
            Contact your account manager to learn more about available redemption options.
          </Typography>
          <Button variant="outlined" color="primary">
            View Redemption Options
          </Button>
        </CardContent>
      </Card>
    </>
  );

  const renderTransactionHistory = () => (
    <>
      <Typography variant="h6" gutterBottom>
        Transaction History
      </Typography>
      
      {transactions.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          No transaction history found. Points will be awarded when you purchase products.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table aria-label="loyalty points transaction history">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      {format(new Date(transaction.date), 'h:mm a')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getTransactionIcon(transaction.type)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {formatTransactionType(transaction.type)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={transaction.type === 'earned' ? 'success.main' : 
                             transaction.type === 'redeemed' ? 'error.main' : 
                             'text.primary'}
                      fontWeight="medium"
                    >
                      {transaction.type === 'earned' ? '+' : 
                       transaction.type === 'redeemed' ? '-' : 
                       transaction.type === 'adjusted' && transaction.points > 0 ? '+' : 
                       transaction.type === 'adjusted' && transaction.points < 0 ? '-' : ''}
                      {Math.abs(transaction.points).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="loyalty tabs">
          <Tab label="Points Overview" />
          <Tab label="Transaction History" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && renderBalance()}
      {activeTab === 1 && renderTransactionHistory()}
      
      <Box display="flex" justifyContent="center" mt={4}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
        >
          Refresh Data
        </Button>
      </Box>
    </Box>
  );
};

export default LoyaltyPointsDisplay; 