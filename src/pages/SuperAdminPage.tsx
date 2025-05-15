import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import organizationsApi, { OrganizationData } from '../services/organizationsApi';
import authService from '../services/authService';
import SuperAdminLoginForm from '../components/SuperAdminLoginForm';
import { usersApi } from '../services/api';

const SuperAdminPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showOrgDetailsModal, setShowOrgDetailsModal] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<OrganizationData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newOrg, setNewOrg] = useState<OrganizationData>({
    name: '',
    description: '',
    status: 'active'
  });
  
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  
  // Add state for dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalOrgs: 0,
    activeOrgs: 0,
    suspendedOrgs: 0,
    inactiveOrgs: 0,
    adminUsers: 0,
    clientUsers: 0,
    dealerUsers: 0
  });
  
  // Add state for edit mode
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editOrgData, setEditOrgData] = useState<OrganizationData | null>(null);
  const [editAdminData, setEditAdminData] = useState<{
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null>(null);
  
  // Add state for reset password information
  const [showResetPasswordInfo, setShowResetPasswordInfo] = useState(false);
  
  // Add state for admin credentials
  const [adminCreatedInfo, setAdminCreatedInfo] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  
  // Add state for modals
  const [showAdminCredentialsModal, setShowAdminCredentialsModal] = useState(false);
  
  // Fetch organizations when component mounts
  useEffect(() => {
    const validateAndFetch = async () => {
      if (user?.role === 'superadmin') {
        // Check for token
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found on page load');
          setError('Authentication token missing. Please log in again.');
          return;
        }
        
        console.log('Found token on page load:', token.substring(0, 15) + '...');
        
        // Validate token
        try {
          const isValid = await authService.checkToken();
          if (!isValid) {
            console.error('Token validation failed');
            setError('Your session appears to be invalid. Please log in again.');
            return;
          }
          
          console.log('Token is valid, proceeding to fetch organizations');
          fetchOrganizations();
        } catch (tokenError) {
          console.error('Error validating token:', tokenError);
          setError('Could not verify your session. Please log in again.');
        }
      }
    };
    
    validateAndFetch();
  }, [user]);
  
  // Read the active tab from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'organizations', 'admins', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  
  // Fetch dashboard statistics when tab changes to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && user?.role === 'superadmin') {
      fetchDashboardStats();
    }
  }, [activeTab, user]);
  
  // Update dashboard stats when organizations are fetched
  useEffect(() => {
    if (organizations.length > 0) {
      updateDashboardStatsFromOrgs();
    }
  }, [organizations]);
  
  // Fetch organizations from the API
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      console.log('Fetching organizations...');
      const data = await organizationsApi.getAll();
      console.log('Organizations fetched:', data);
      setOrganizations(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      const errorMessage = err.message || 'Failed to fetch organizations';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Update dashboard stats from organizations
  const updateDashboardStatsFromOrgs = () => {
    const activeOrgs = organizations.filter((org: any) => org.status === 'active').length;
    const suspendedOrgs = organizations.filter((org: any) => org.status === 'suspended').length;
    const inactiveOrgs = organizations.filter((org: any) => org.status === 'inactive').length;
    
    setDashboardStats(prev => ({
      ...prev,
      totalOrgs: organizations.length,
      activeOrgs,
      suspendedOrgs,
      inactiveOrgs
    }));
  };
  
  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      // If we haven't fetched organizations yet, do that first
      if (organizations.length === 0) {
        await fetchOrganizations();
      }
      
      // Fetch user counts
      const response = await api.get('/admin/stats');
      
      if (response.data) {
        setDashboardStats(prev => ({
          ...prev,
          adminUsers: response.data.userCounts?.admin || 0,
          clientUsers: response.data.userCounts?.client || 0,
          dealerUsers: response.data.userCounts?.dealer || 0
        }));
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      // We'll just use the organization counts we have
    }
  };
  
  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState({}, '', `/dashboard/superadmin${tab === 'dashboard' ? '' : `?tab=${tab}`}`);
  };
  
  // Handle creating a new organization with admin user
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOrg.name || !newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setError('Please fill all required fields for both organization and admin user');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Check token before making the request
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Creating organization with data:', newOrg);

      // Store the admin credentials for later display
      const adminCredentials = {
        name: newAdmin.name,
        email: newAdmin.email,
        password: newAdmin.password
      };

      // Try using the new combined endpoint if it exists
      try {
        // Display token for debugging
        console.log('Using token for createWithAdmin:', token.substring(0, 15) + '...');
        
        // Create organization with admin in a single request
        const result = await organizationsApi.createWithAdmin({
          organization: newOrg,
          admin: {
            ...newAdmin,
            status: 'active',
            createdBySuperAdmin: true
          }
        });
        
        console.log('Organization and admin created:', result);
        
        // Save the admin credentials for display
        setAdminCreatedInfo(adminCredentials);
      } catch (combinedError) {
        console.warn('Combined endpoint failed, falling back to separate requests:', combinedError);
        
        // Display token for debugging
        console.log('Using token for separate requests:', token.substring(0, 15) + '...');
        
        // Fall back to separate requests if combined endpoint fails
        // First, create the organization
        const orgData = await organizationsApi.create(newOrg);
        console.log('Organization created:', orgData);
        
        const organizationId = orgData._id || orgData.id;
        
        if (!organizationId) {
          throw new Error('Organization was created but no ID was returned');
        }
        
        console.log('Creating admin for organization ID:', organizationId);

        // Then create the admin user for this organization
        const adminData = {
          ...newAdmin,
          role: 'admin' as const,
          organizationId,
          status: 'active' as const,
          createdBySuperAdmin: true
        };
        
        const adminResponse = await organizationsApi.createAdmin(adminData);
        console.log('Admin created:', adminResponse);
        
        // Save the admin credentials for display
        setAdminCreatedInfo(adminCredentials);
      }
      
      // Reset the form and close the modal
      setNewOrg({
        name: '',
        description: '',
        status: 'active'
      });
      
      setNewAdmin({
        name: '',
        email: '',
        password: '',
        phone: ''
      });
      
      setShowCreateOrgModal(false);
      
      // Show admin credentials modal
      setShowAdminCredentialsModal(true);
      
      // Refresh organizations
      fetchOrganizations();
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error creating organization:', err);
      
      // Check for 401 Unauthorized errors
      if (err.response?.status === 401) {
        console.error('Authentication error (401) when creating organization');
        setError('Authentication failed. Please log out and log in again to refresh your session.');
        
        // Log token info for debugging
        const token = localStorage.getItem('token');
        if (token) {
          console.error('Current token:', token.substring(0, 15) + '...');
        } else {
          console.error('No token found in localStorage');
        }
      } else {
        // For other errors
        const errorMessage = err.response?.data?.message || err.message || 'Failed to create organization';
        setError(errorMessage);
      }
      
      setLoading(false);
    }
  };
  
  // Handle input change for organization form
  const handleOrgInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle input change for admin form
  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAdmin(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle viewing organization details
  const handleViewOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      setError('');
      
      // Use the new endpoint that includes admin users
      const orgDetailsWithAdmins = await organizationsApi.getWithAdmins(orgId);
      setCurrentOrg(orgDetailsWithAdmins);
      
      // Set a temporary password indicator for the admin
      if (orgDetailsWithAdmins.admins && orgDetailsWithAdmins.admins.length > 0) {
        // We'll use this to indicate admin password should be reset
        setShowResetPasswordInfo(true);
      }
      
      setShowOrgDetailsModal(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching organization details:', err);
      const errorMessage = err.message || 'Failed to fetch organization details';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Handle deleting an organization
  const handleDeleteOrganization = async (orgId: string, deleteUsers = false) => {
    const confirmMessage = deleteUsers 
      ? 'Are you sure you want to delete this organization AND all its associated users? This action cannot be undone.'
      : 'Are you sure you want to delete this organization? This action cannot be undone.';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      if (deleteUsers) {
        // First, delete all users associated with this organization
        console.log(`Deleting all users for organization ID: ${orgId}`);
        try {
          const deleteUsersResponse = await api.delete(`/api/users/by-organization/${orgId}`);
          console.log('Users deletion response:', deleteUsersResponse.data);
        } catch (deleteUserErr: any) {
          console.error('Error deleting users:', deleteUserErr);
          if (deleteUserErr.response?.status === 404) {
            console.log('No users found to delete, proceeding with organization deletion');
            // Continue with organization deletion even if no users were found
          } else {
            throw deleteUserErr; // Re-throw for other errors
          }
        }
      }
      
      // Then delete the organization
      await organizationsApi.delete(orgId);
      
      // Close the modal and refresh the organization list
      setShowOrgDetailsModal(false);
      fetchOrganizations();
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      let errorMessage = err.response?.data?.message || err.message || 'Failed to delete organization';
      setError(errorMessage);
      
      // If the error message indicates that there are associated users, offer to delete them as well
      if (errorMessage.includes('associated users') && !deleteUsers) {
        const userCount = errorMessage.match(/(\d+) associated/)?.[1] || 'multiple';
        if (window.confirm(`The organization has ${userCount} associated users. Would you like to delete these users and the organization?`)) {
          // If user confirms, retry with deleteUsers=true
          await handleDeleteOrganization(orgId, true);
        }
      }
      
      setLoading(false);
    }
  };
  
  // Handle editing an organization
  const handleEditOrganization = () => {
    if (currentOrg) {
      setEditOrgData({
        ...currentOrg,
        name: currentOrg.name,
        description: currentOrg.description || '',
        status: currentOrg.status
      });
      
      // Set the first admin data if available
      if (currentOrg.admins && currentOrg.admins.length > 0) {
        const admin = currentOrg.admins[0];
        setEditAdminData({
          id: admin._id || '',
          name: admin.name,
          email: admin.email,
          phone: admin.phone
        });
      }
      
      setShowEditOrgModal(true);
      setShowOrgDetailsModal(false);
    }
  };
  
  // Handle saving organization edits
  const handleSaveOrgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editOrgData) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Update organization
      await organizationsApi.update(editOrgData._id as string, {
        name: editOrgData.name,
        description: editOrgData.description,
        status: editOrgData.status
      });
      
      // Update admin user if we have one
      if (editAdminData && editAdminData.id) {
        await api.put(`/api/users/${editAdminData.id}`, {
          name: editAdminData.name,
          email: editAdminData.email,
          phone: editAdminData.phone
        });
      }
      
      // Close edit modal and refresh data
      setShowEditOrgModal(false);
      fetchOrganizations();
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error updating organization:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update organization';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Handle input change for organization edit form
  const handleEditOrgInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditOrgData(prev => prev ? {
      ...prev,
      [name]: value
    } : null);
  };
  
  // Handle input change for admin edit form
  const handleEditAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditAdminData(prev => prev ? {
      ...prev,
      [name]: value
    } : null);
  };
  
  // Handle resetting admin password
  const handleResetPassword = async (adminId: string) => {
    if (!window.confirm('Are you sure you want to reset this admin\'s password? They will be assigned a temporary password.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const result = await usersApi.resetPassword(adminId);
      
      // Show success message with the temporary password
      alert(`Password reset successfully.\n\nTemporary password: ${result.temporaryPassword}\n\nPlease share this with the admin user.`);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Ensure only superadmin can access this page
  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Show the login form if there's an authentication error
  if (error && (error.includes('Authentication') || error.includes('token') || error.includes('session'))) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-red-600">Authentication Error</h2>
          <p className="mt-2 mb-6 text-red-600">{error}</p>
          <p className="mb-6">Please use the form below to re-authenticate:</p>
          
          <SuperAdminLoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Super Admin Console</h1>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('dashboard')}
            >
              Dashboard
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                activeTab === 'organizations'
                  ? 'text-blue-600 border-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('organizations')}
            >
              Organizations
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                activeTab === 'admins'
                  ? 'text-blue-600 border-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('admins')}
            >
              Admin Users
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('settings')}
            >
              System Settings
            </button>
          </li>
        </ul>
      </div>
      
      {/* Dashboard Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizations</h2>
            <p className="text-gray-600 mb-2">Total Organizations: <span className="font-semibold">{dashboardStats.totalOrgs}</span></p>
            <p className="text-gray-600 mb-2">Active Organizations: <span className="font-semibold text-green-600">{dashboardStats.activeOrgs}</span></p>
            <p className="text-gray-600 mb-2">Suspended Organizations: <span className="font-semibold text-red-600">{dashboardStats.suspendedOrgs}</span></p>
            <button 
              onClick={() => handleTabChange('organizations')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Manage Organizations →
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
            <p className="text-gray-600 mb-2">Admin Users: <span className="font-semibold">{dashboardStats.adminUsers}</span></p>
            <p className="text-gray-600 mb-2">Client Users: <span className="font-semibold">{dashboardStats.clientUsers}</span></p>
            <p className="text-gray-600 mb-2">Dealer Users: <span className="font-semibold">{dashboardStats.dealerUsers}</span></p>
            <button 
              onClick={() => handleTabChange('admins')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Manage Admin Users →
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System</h2>
            <p className="text-gray-600 mb-2">Platform Status: <span className="font-semibold text-green-600">Operational</span></p>
            <p className="text-gray-600 mb-2">Database Status: <span className="font-semibold text-green-600">Connected</span></p>
            <p className="text-gray-600 mb-2">Last Backup: <span className="font-semibold">Today 03:00 AM</span></p>
            <button 
              onClick={() => handleTabChange('settings')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              View System Settings →
            </button>
          </div>
        </div>
      )}
      
      {/* Organizations Tab Content */}
      {activeTab === 'organizations' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Organizations</h2>
            <button 
              onClick={() => setShowCreateOrgModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Organization
            </button>
          </div>
          
          {loading && <p className="text-gray-600">Loading organizations...</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  organizations.map((org: any) => (
                    <tr key={org._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        {org.contactInfo && org.contactInfo.website && (
                          <div className="text-sm text-gray-500">{org.contactInfo.website}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${org.status === 'active' ? 'bg-green-100 text-green-800' : 
                           org.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                           'bg-yellow-100 text-yellow-800'}`}>
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.description?.substring(0, 50)}
                        {org.description?.length > 50 ? '...' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewOrganization(org._id);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteOrganization(org._id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Admin Users Tab Content */}
      {activeTab === 'admins' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Admin Users</h2>
            <button 
              onClick={() => setShowCreateOrgModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Organization with Admin
            </button>
          </div>
          
          {loading && <p className="text-gray-600">Loading admin users...</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No admin users found
                    </td>
                  </tr>
                ) : (
                  // Map through organizations and display their admins
                  organizations.flatMap((org) => 
                    org.admins && org.admins.length > 0 
                      ? org.admins.map((admin) => (
                        <tr key={admin._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img 
                                  className="h-10 w-10 rounded-full" 
                                  src={admin.avatar || "/images/avatars/default.jpg"} 
                                  alt={admin.name} 
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                                <div className="text-sm text-gray-500">Admin</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${admin.status === 'active' ? 'bg-green-100 text-green-800' : 
                               admin.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                               'bg-yellow-100 text-yellow-800'}`}>
                              {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleResetPassword(admin._id as string)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Reset Password
                            </button>
                            <button 
                              onClick={() => {
                                // Handle toggle status (suspend/activate)
                                const newStatus = admin.status === 'active' ? 'suspended' : 'active';
                                // Call API to update status
                              }}
                              className={`${admin.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            >
                              {admin.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                      : []
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Settings</h2>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Platform Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                  <input type="text" defaultValue="Revino Dealer Loyalty Platform" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default User Role</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>dealer</option>
                    <option>client</option>
                    <option>admin</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input id="maintenance-mode" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="maintenance-mode" className="ml-2 block text-sm text-gray-700">Enable Maintenance Mode</label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input id="allow-registration" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <label htmlFor="allow-registration" className="ml-2 block text-sm text-gray-700">Allow Public Registration</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Database Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Database Status</label>
                  <div className="mt-1 flex items-center">
                    <span className="inline-flex h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-sm text-gray-700">Connected</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Database Size</label>
                  <div className="mt-1 text-sm text-gray-700">1.2 GB</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option>daily</option>
                    <option>weekly</option>
                    <option>monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Backup</label>
                  <div className="mt-1 text-sm text-gray-700">2023-08-12 03:00 AM</div>
                </div>
                <div className="md:col-span-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Backup Now
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">API Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input id="enable-public-api" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="enable-public-api" className="ml-2 block text-sm text-gray-700">Enable Public API</label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input id="require-api-key" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <label htmlFor="require-api-key" className="ml-2 block text-sm text-gray-700">Require API Key</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
                  <input type="number" defaultValue="60" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input type="text" value="api_6f9b5a3c7d2e1f8a4b0c5d6e" readOnly className="flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                    <button className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                      Copy
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Generate New API Key
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Organization</h3>
            
            {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            
            <form onSubmit={handleCreateOrg}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Organization Details</h4>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Organization Name*</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={newOrg.name}
                      onChange={handleOrgInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={newOrg.description}
                      onChange={handleOrgInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={newOrg.status}
                      onChange={handleOrgInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                
                {/* Admin User Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Admin User</h4>
                  <div>
                    <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">Admin Name*</label>
                    <input
                      type="text"
                      id="adminName"
                      name="name"
                      value={newAdmin.name}
                      onChange={handleAdminInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Email*</label>
                    <input
                      type="email"
                      id="adminEmail"
                      name="email"
                      value={newAdmin.email}
                      onChange={handleAdminInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Password*</label>
                    <input
                      type="password"
                      id="adminPassword"
                      name="password"
                      value={newAdmin.password}
                      onChange={handleAdminInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      id="adminPhone"
                      name="phone"
                      value={newAdmin.phone}
                      onChange={handleAdminInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Organization with Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Organization Details Modal */}
      {showOrgDetailsModal && currentOrg && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Details</h3>
            
            {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Organization Information</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                  <div className="mt-1 text-sm text-gray-900 font-medium">{currentOrg.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${currentOrg.status === 'active' ? 'bg-green-100 text-green-800' : 
                      currentOrg.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                      {currentOrg.status.charAt(0).toUpperCase() + currentOrg.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <div className="mt-1 text-sm text-gray-700">{currentOrg.description}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <div className="mt-1 text-sm text-gray-700">
                    {currentOrg.createdAt && new Date(currentOrg.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mt-6 mb-3">Admin Users</h4>
                {currentOrg?.admins && currentOrg.admins.length > 0 ? (
                  currentOrg.admins.map((admin, index) => (
                    <div key={admin._id || index} className="border rounded-md p-3 mb-3 bg-gray-50">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{admin.name}</div>
                          <div className="text-sm text-gray-600">{admin.email}</div>
                          <div className="text-sm text-gray-600">{admin.phone || 'No phone number'}</div>
                          {showResetPasswordInfo && (
                            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                              <p className="font-medium">First-time login instructions:</p>
                              <p>Use the email address above with the password that was set during creation.</p>
                              <p>If you don't know the password, use the Reset Password button.</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleResetPassword(admin._id as string)}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-md text-sm self-start"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 italic">No admin users found for this organization.</div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowOrgDetailsModal(false)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEditOrganization}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                Edit Organization
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentOrg?._id) {
                    handleDeleteOrganization(currentOrg._id);
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Delete Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Organization Modal */}
      {showEditOrgModal && editOrgData && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Organization</h3>
            
            {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
            
            <form onSubmit={handleSaveOrgEdit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Organization Details</h4>
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Organization Name*</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      value={editOrgData.name}
                      onChange={handleEditOrgInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="edit-description"
                      name="description"
                      value={editOrgData.description || ''}
                      onChange={handleEditOrgInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      id="edit-status"
                      name="status"
                      value={editOrgData.status}
                      onChange={handleEditOrgInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                
                {/* Admin User Details */}
                {editAdminData && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Admin User</h4>
                    <div>
                      <label htmlFor="edit-adminName" className="block text-sm font-medium text-gray-700">Admin Name*</label>
                      <input
                        type="text"
                        id="edit-adminName"
                        name="name"
                        value={editAdminData.name}
                        onChange={handleEditAdminInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-adminEmail" className="block text-sm font-medium text-gray-700">Email*</label>
                      <input
                        type="email"
                        id="edit-adminEmail"
                        name="email"
                        value={editAdminData.email}
                        onChange={handleEditAdminInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-adminPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        id="edit-adminPhone"
                        name="phone"
                        value={editAdminData.phone || ''}
                        onChange={handleEditAdminInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditOrgModal(false);
                    setShowOrgDetailsModal(true); // Return to details view
                  }}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Admin Credentials Modal */}
      {showAdminCredentialsModal && adminCreatedInfo && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Admin Account Created</h3>
            
            <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-4">
              <p>Organization and admin user created successfully!</p>
            </div>
            
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-gray-900 mb-2">Admin Login Credentials</h4>
              <p className="text-sm text-gray-800 mb-1"><span className="font-medium">Name:</span> {adminCreatedInfo.name}</p>
              <p className="text-sm text-gray-800 mb-1"><span className="font-medium">Email:</span> {adminCreatedInfo.email}</p>
              <p className="text-sm text-gray-800 mb-4"><span className="font-medium">Password:</span> {adminCreatedInfo.password}</p>
              
              <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>Please save these credentials! The admin will need them to log in.</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAdminCredentialsModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;