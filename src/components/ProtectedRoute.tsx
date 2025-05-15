import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './common/LoadingSpinner';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Add logging for debugging
  useEffect(() => {
    console.log('ProtectedRoute - Current path:', location.pathname);
    console.log('ProtectedRoute - Auth state:', { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user,
      userRole: user?.role || 'none'
    });
  }, [isAuthenticated, isLoading, user, location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    console.log('ProtectedRoute - Still loading auth data...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes
  console.log('ProtectedRoute - Authenticated, rendering child routes');
  return <Outlet />;
};

export default ProtectedRoute; 