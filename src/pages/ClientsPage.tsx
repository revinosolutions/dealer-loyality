import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { clientsApi, ClientData } from '../services/clientsApi';

// Using the ClientData interface from clientsApi.ts
type Client = ClientData & {
  _id: string; // Ensure _id is required for clients in the UI
}

const ClientsPage = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    position: '',
    city: '',
    state: '',
    country: '',
    password: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  useEffect(() => {
    // Check API connectivity before fetching clients
    checkClientApiConnectivity();
    fetchClients();
  }, []);

  useEffect(() => {
    // Filter clients based on search term
    if (!Array.isArray(clients)) {
      setFilteredClients([]);
      return;
    }
    
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredClients(clients.filter(client => 
        client.name.toLowerCase().includes(term) || 
        client.email.toLowerCase().includes(term) || 
        (client.company?.name ? client.company.name.toLowerCase().includes(term) : false)
      ));
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    
    // Define alternative endpoints to try
    const endpointsToTry = [
      { endpoint: 'clients', method: 'GET' as 'GET' },
      { endpoint: '/admin/clients', method: 'GET' as 'GET' },
      { endpoint: '/api/clients', method: 'GET' as 'GET' }
    ];
    
    let clientsData = null;
    
    // Try each endpoint until one succeeds
    for (const { endpoint, method } of endpointsToTry) {
      try {
        console.log(`Attempting to fetch clients using endpoint: ${endpoint}`);
        
        // Use clientsApi.getAll() for the default endpoint, otherwise use direct apiRequest
        let response;
        if (endpoint === 'clients') {
          response = await clientsApi.getAll();
        } else {
          // For other endpoints, we need to use the imported apiRequest
          const { apiRequest } = await import('../services/api');
          response = await apiRequest(endpoint, method);
        }
        
        if (response) {
          console.log(`Clients API Response from ${endpoint}:`, response);
          clientsData = response;
          break; // Stop trying endpoints if successful
        }
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed:`, error);
        // Continue to next endpoint
      }
    }
    
    try {
      // If all apiRequest attempts failed, try direct axios as last resort
      if (!clientsData) {
        console.log('All API endpoints failed, attempting direct request...');
        
        try {
          const directResponse = await fetch('/api/clients', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (directResponse.ok) {
            clientsData = await directResponse.json();
            console.log('Direct fetch succeeded:', clientsData);
          }
        } catch (directError) {
          console.error('Direct fetch request also failed:', directError);
        }
      }
      
      // If we have data, process it
      if (clientsData) {
        let clientsList: Client[] = [];
        
        // Handle different response structures
        if (Array.isArray(clientsData)) {
          clientsList = clientsData as Client[];
        } else if (clientsData.clients && Array.isArray(clientsData.clients)) {
          clientsList = clientsData.clients as Client[];
        } else if (clientsData && typeof clientsData === 'object') {
          // Try to extract clients array from any response structure
          const dataObj = clientsData as Record<string, unknown>;
          for (const key in dataObj) {
            if (Array.isArray(dataObj[key])) {
              clientsList = dataObj[key] as Client[];
              console.log(`Found clients array in response.${key}`);
              break;
            }
          }
        }
        
        console.log(`Processed ${clientsList.length} clients`);
        
        // Ensure all clients have required fields
        clientsList = clientsList.map(client => ({
          ...client,
          _id: client._id || `temp-${Date.now()}`, // Ensure _id exists
          name: client.name || 'Unnamed Client',
          email: client.email || 'no-email',
          status: client.status || 'active',
          stats: client.stats || {
            totalSales: 0,
            rewardsRedeemed: 0
          }
        }));
        
        setClients(clientsList);
        setFilteredClients(clientsList);
      } else {
        // If all attempts failed
        throw new Error('Failed to fetch clients from any endpoint');
      }
    } catch (err: any) {
      console.error('Error processing clients data:', err);
      setError(`Failed to load clients: ${err.message || 'Unknown error'}`);
      
      // Set empty arrays as fallback
      setClients([]);
      setFilteredClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
  };

  const handleCreateClient = () => {
    setFormMode('create');
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyName: '',
      position: '',
      city: '',
      state: '',
      country: '',
      password: '',
      status: 'active'
    });
    setFormErrors({});
    setError('');
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setFormMode('edit');
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      companyName: client.company?.name || '',
      position: client.company?.position || '',
      city: client.address?.city || '',
      state: client.address?.state || '',
      country: client.address?.country || '',
      password: '',
      status: client.status
    });
    setFormErrors({});
    setError('');
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.name.trim()) errors.name = 'Name is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    // Password validation for new clients
    if (formMode === 'create' && (!formData.password || formData.password.length < 6)) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^\+?[0-9\s-()]{8,20}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Status validation
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    
    try {
      // Prepare client data from form
      const clientData: ClientData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        status: formData.status,
        company: {},
        address: {},
        createdByAdmin: true,  // Ensure this flag is set
        role: 'client'  // Explicitly set the role to client
      };

      // Only add password for new clients or if provided for existing clients
      if (formData.password) {
        clientData.password = formData.password;
      }

      // Add optional fields only if they have values
      if (formData.phone) clientData.phone = formData.phone.trim();
      
      // Add company details if provided
      if (formData.companyName) clientData.company!.name = formData.companyName.trim();
      if (formData.position) clientData.company!.position = formData.position.trim();
      
      // Add address details if provided
      if (formData.city) clientData.address!.city = formData.city.trim();
      if (formData.state) clientData.address!.state = formData.state.trim();
      if (formData.country) clientData.address!.country = formData.country.trim();

      // If company or address objects are empty, set them to undefined
      if (Object.keys(clientData.company!).length === 0) delete clientData.company;
      if (Object.keys(clientData.address!).length === 0) delete clientData.address;

      let response;
      if (formMode === 'create') {
        // Create a new client using the service
        response = await clientsApi.create(clientData);
      } else {
        // Update existing client
        response = await clientsApi.update(selectedClient?._id as string, clientData);
      }

      // Show success message
      setSuccessMessage(formMode === 'create' ? 'Client created successfully!' : 'Client updated successfully!');
      setIsModalOpen(false);
      fetchClients();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting client:', err);
      setError(err.message || (formMode === 'create' ? 'Failed to create client' : 'Failed to update client'));
      
      // Keep modal open when there's an error
      return;
    } finally {
      // Reset submitting state
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        // Delete client using the clientsApi service
        await clientsApi.delete(clientId);
        setSuccessMessage('Client deleted successfully!');
        fetchClients();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err: any) {
        console.error('Error deleting client:', err);
        setError(err.message || 'Failed to delete client');
      }
    }
  };

  // Function to check API connectivity for clients
  const checkClientApiConnectivity = async () => {
    console.log('Checking clients API connectivity...');
    
    const endpointsToCheck = [
      '/api/clients',
      '/api/admin/clients',
      '/clients'
    ];
    
    for (const endpoint of endpointsToCheck) {
      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`API endpoint ${endpoint} check result: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log(`✅ Found working clients endpoint: ${endpoint}`);
          break;
        }
      } catch (error) {
        console.warn(`❌ API endpoint ${endpoint} check failed:`, error);
      }
    }
  };

  // Access control - only admin and dealer can view clients
  if (user?.role !== 'admin' && user?.role !== 'dealer') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clients Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchClients()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleCreateClient}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Client
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Clients</p>
                <p className="text-xl font-bold">{Array.isArray(filteredClients) ? filteredClients.length : 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Sales</p>
                <p className="text-xl font-bold">${Array.isArray(filteredClients) ? filteredClients.reduce((sum, client) => sum + (client.stats?.totalSales || 0), 0).toLocaleString() : '0'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Contests</p>
                <p className="text-xl font-bold">{Array.isArray(filteredClients) ? filteredClients.reduce((sum, client) => sum + (client.stats?.activeContests || 0), 0) : 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Rewards</p>
                <p className="text-xl font-bold">{Array.isArray(filteredClients) ? filteredClients.reduce((sum, client) => sum + (client.stats?.activeRewards || 0), 0) : 0}</p>
              </div>
            </div>
          </div>
        </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{successMessage}</div>}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <div className="relative inline-block w-48">
          <select 
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:ring focus:border-blue-300"
            onChange={(e) => {
              const status = e.target.value;
              if (status === 'all') {
                setFilteredClients(Array.isArray(clients) ? clients : []);
              } else {
                setFilteredClients(Array.isArray(clients) ? clients.filter(client => client.status === status) : []);
              }
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : !Array.isArray(filteredClients) || filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilteredClients(Array.isArray(clients) ? clients : []);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredClients) && filteredClients.map((client) => (
                <tr key={client._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {client.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.company?.name || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.email}</div>
                    <div className="text-sm text-gray-500">{client.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {[client.address?.city, client.address?.state, client.address?.country].filter(Boolean).join(', ') || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${client.status === 'active' ? 'bg-green-100 text-green-800' : 
                        client.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${client.stats?.totalSales?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(client)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditClient(client)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && !isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{selectedClient.name}</h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Contact Information</h3>
                <p className="mt-2">Email: {selectedClient.email}</p>
                <p>Phone: {selectedClient.phone || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Company Details</h3>
                <p className="mt-2">Company: {selectedClient.company?.name || 'N/A'}</p>
                <p>Position: {selectedClient.company?.position || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Location</h3>
                <p className="mt-2">
                  {[selectedClient.address?.city, selectedClient.address?.state, selectedClient.address?.country]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Statistics</h3>
                <p className="mt-2">Total Sales: ${selectedClient.stats?.totalSales?.toLocaleString() || '0'}</p>
                <p>Rewards Redeemed: {selectedClient.stats?.rewardsRedeemed || 0}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Business Metrics</h3>
                <p className="mt-2">Total Dealers: {selectedClient.stats?.totalDealers || 0}</p>
                <p>Active Contests: {selectedClient.stats?.activeContests || 0}</p>
                <p>Active Rewards: {selectedClient.stats?.activeRewards || 0}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditClient(selectedClient)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
              >
                Edit Client
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{formMode === 'create' ? 'Add New Client' : 'Edit Client'}</h2>
              <button
                onClick={() => {
                  if (!isSubmitting) {
                    setIsModalOpen(false);
                    setFormErrors({});
                    setError('');
                  }
                }}
                disabled={isSubmitting}
                className={`text-gray-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-700'}`}
              >
                ✕
              </button>
            </div>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            
            {formMode === 'create' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <p className="text-sm">
                  <strong>Note:</strong> New clients will be able to log in with the email and password you provide.
                  The name, email, and password fields are required. Password must be at least 6 characters.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={`mt-1 block w-full border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    required
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="client@company.com (will be used for login)"
                    className={`mt-1 block w-full border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    required
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                {formMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      placeholder="Client login password (min 6 characters)"
                      className={`mt-1 block w-full border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                      required={formMode === 'create'}
                    />
                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                )}
                {formMode === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password <span className="text-gray-400 text-xs">(leave blank to keep current)</span></label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      className={`mt-1 block w-full border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    />
                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className={`mt-1 block w-full border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State/Province</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className={`mt-1 block w-full border ${formErrors.status ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  {formErrors.status && <p className="text-red-500 text-xs mt-1">{formErrors.status}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) {
                      setIsModalOpen(false);
                      setFormErrors({});
                      setError('');
                    }
                  }}
                  disabled={isSubmitting}
                  className={`bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-400'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded flex items-center justify-center`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {formMode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    formMode === 'create' ? 'Create Client' : 'Update Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;