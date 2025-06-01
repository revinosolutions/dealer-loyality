import React from 'react';
import { Container, Paper, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { Package as InventoryIcon } from 'react-feather';
import ClientProductsDisplay from '../components/client/ClientProductsDisplay';
import { useAuth } from '../contexts/AuthContext';

// Define types for user roles
type UserRole = 'superadmin' | 'admin' | 'dealer' | 'client' | 'client_admin' | string;

const ClientProductsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Redirect if user is not authenticated or not a client
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user is either a client or client_admin
  if (user && user.role && user.role !== 'client' && user.role !== 'client_admin') {
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center">
            <InventoryIcon size={24} style={{ marginRight: '8px' }} color="#1976d2" />
            <Typography variant="h4" component="h1" gutterBottom>
              My Inventory
            </Typography>
          </Box>
        </Box>
        
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">My Inventory</Typography>
        </Breadcrumbs>
      </Paper>

      {/* Client Products Display Component */}
      <Paper sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <ClientProductsDisplay />
      </Paper>
    </Container>
  );
};

export default ClientProductsPage; 