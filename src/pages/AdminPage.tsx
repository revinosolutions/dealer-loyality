import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';

const AdminPage = () => {
  const { user } = useAuth();

  // Only admin users should access this page
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Render the admin dashboard page
  return <AdminDashboardPage />;
};

export default AdminPage; 