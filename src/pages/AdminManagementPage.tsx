import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, ChevronDown, Edit, Trash2, Eye, AlertCircle, Building, UserPlus } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import AdminModal, { CompanyAdmin } from '../components/admin/AdminModal';

// Using CompanyAdmin type imported from AdminModal component

// Removed mock company admins data

const AdminManagementPage = () => {
  const { user } = useAuth();
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<CompanyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState<CompanyAdmin | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  
  // Fetch company admins
  useEffect(() => {
    const fetchCompanyAdmins = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would be an API call
        const response = await fetch('/api/company-admins');
        const data = await response.json();
        setCompanyAdmins(data);
        
        // No longer using mock data
      } catch (error: unknown) {
        console.error('Error fetching company admins:', error);
        setError('Failed to load company admins');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyAdmins();
  }, []);

  // Filter admins based on search and filters
  useEffect(() => {
    let result = [...companyAdmins];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(admin => 
        admin.name.toLowerCase().includes(term) || 
        admin.email.toLowerCase().includes(term) || 
        admin.companyName.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(admin => 
        admin.status === statusFilter
      );
    }
    
    setFilteredAdmins(result);
  }, [companyAdmins, searchTerm, statusFilter]);

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle view admin details
  const handleViewAdmin = (admin: CompanyAdmin) => {
    setSelectedAdmin(admin);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle edit admin
  const handleEditAdmin = (admin: CompanyAdmin) => {
    setSelectedAdmin(admin);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle create new admin
  const handleCreateAdmin = () => {
    setSelectedAdmin(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle delete admin
  const handleDeleteAdmin = (adminId: string) => {
    if (window.confirm('Are you sure you want to delete this company admin?')) {
      // In a real implementation, this would be an API call
      // await fetch(`/api/company-admins/${adminId}`, { method: 'DELETE' });
      
      // Update local state
      setCompanyAdmins(prevAdmins => 
        prevAdmins.filter(admin => admin.id !== adminId)
      );
      
      // Call the deleteUser function from AuthContext
      deleteUser(adminId).catch(err => {
        console.error('Error deleting user:', err);
        setError('Failed to delete company admin');
      });
    }
  };

  // Handle save admin (create or update)
  const handleSaveAdmin = (admin: CompanyAdmin) => {
    if (modalMode === 'create') {
      // In a real implementation, this would be an API call
      // await fetch('/api/company-admins', { method: 'POST', body: JSON.stringify(admin) });
      
      // Generate a new ID for the admin
      const newAdmin = {
        ...admin,
        id: (companyAdmins.length + 1).toString(),
        role: 'client' as UserRole,
        joinDate: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0],
      };
      
      // Update local state
      setCompanyAdmins(prevAdmins => [...prevAdmins, newAdmin]);
      
      // Call the register function from AuthContext
      register({
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: 'client',
        company: admin.companyName,
        phone: admin.companyPhone,
        location: admin.location,
      }).catch(err => {
        console.error('Error registering user:', err);
        setError('Failed to create company admin');
      });
    } else if (modalMode === 'edit') {
      // In a real implementation, this would be an API call
      // await fetch(`/api/company-admins/${admin.id}`, { method: 'PUT', body: JSON.stringify(admin) });
      
      // Update local state
      setCompanyAdmins(prevAdmins => 
        prevAdmins.map(a => a.id === admin.id ? admin : a)
      );
      
      // Call the updateUser function from AuthContext
      updateUser(admin.id, {
        name: admin.name,
        email: admin.email,
        company: admin.companyName,
        phone: admin.companyPhone,
        location: admin.location,
      }).catch(err => {
        console.error('Error updating user:', err);
        setError('Failed to update company admin');
      });
    }
    
    setIsModalOpen(false);
  };

  // Render admin status badge
  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    let textColor = '';
    
    switch (status) {
      case 'active':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'inactive':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'pending':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {status}
      </span>
    );
  };

  // Check if user has permission to manage company admins
  const canManageAdmins = user?.role === 'admin';

  if (!canManageAdmins) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-center">
            You do not have permission to access the Admin Management page.
            This page is only accessible to super administrators.
          </p>
        </div>
    );
  }

  return (
    <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Admin Management</h1>
            <p className="text-gray-600">
              Create and manage company administrators and their inventory allocations
            </p>
          </div>
          
          <button
            onClick={handleCreateAdmin}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <UserPlus size={16} className="mr-2" />
            Add New Company Admin
          </button>
        </div>
        
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or company"
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Admins Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading company admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Users size={48} className="mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No company admins found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start by adding a new company admin'}
            </p>
            <button
              onClick={handleCreateAdmin}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus size={16} className="mr-2" />
              Add New Company Admin
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company / Admin
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory Allocation
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {admin.avatar ? (
                            <img className="h-10 w-10 rounded-full" src={admin.avatar} alt={admin.name} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-800 font-medium text-sm">
                                {admin.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.companyName}</div>
                          <div className="text-sm text-gray-500">{admin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.email}</div>
                      <div className="text-sm text-gray-500">{admin.companyPhone || admin.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {admin.inventoryAllocation !== undefined ? (
                        <div className="text-sm font-medium">
                          {admin.inventoryAllocation > 0 ? (
                            <span className="text-green-600">{admin.inventoryAllocation} units</span>
                          ) : (
                            <span className="text-gray-500">No allocation</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(admin.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(admin.joinDate || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewAdmin(admin)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Admin Modal Component */}
        {isModalOpen && (
          <AdminModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            admin={selectedAdmin}
            mode={modalMode}
            onSave={handleSaveAdmin}
          />
        )}
      </div>
  );
};

export default AdminManagementPage;