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
    
    // Clear redirect flag when component mounts
    if (location.pathname !== '/login') {
      sessionStorage.removeItem('auth_redirect');
    }
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
    
    // Prevent redirect loops by checking session storage
    if (!sessionStorage.getItem('auth_redirect')) {
      sessionStorage.setItem('auth_redirect', 'true');
      return <Navigate to="/login" replace state={{ from: location }} />;
    } else {
      console.warn('ProtectedRoute - Preventing redirect loop to login');
      // Just show a loading spinner instead of redirecting again
      return (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying your authentication...</p>
        </div>
      );
    }
  }

  // If authenticated, render the child routes
  console.log('ProtectedRoute - Authenticated, rendering child routes');
  return <Outlet />;
};

export default ProtectedRoute; 