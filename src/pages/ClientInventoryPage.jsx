import React from 'react';
import { Box, Typography, Container, Paper, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ClientInventoryDisplay from '../components/client/ClientInventoryDisplay';
import { Inventory as InventoryIcon } from '@mui/icons-material';

const ClientInventoryPage = () => {
  const { user, isAuthenticated } = useAuth();

  // Redirect if user is not authenticated or not a client
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user && user.role !== 'client' && user.role !== 'client_admin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          mb: 4,
          backgroundColor: 'transparent',
        }}
      >
        <Box display="flex" alignItems="center" mb={1}>
          <InventoryIcon fontSize="large" sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            My Inventory
          </Typography>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">Inventory</Typography>
        </Breadcrumbs>
        
        <Typography variant="body1" color="text.secondary" mt={1}>
          View your current inventory with all approved stock. This inventory is updated when your purchase requests are approved by an admin.
        </Typography>
      </Paper>

      {/* Inventory Content */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <ClientInventoryDisplay />
      </Paper>
    </Container>
  );
};

export default ClientInventoryPage; 