import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { createDealer, getClientDealers, deleteDealer } from '../services/userService';
import { toast } from 'react-hot-toast';
import { UserData } from '../services/userService';

interface Dealer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    city: string;
    state: string;
    country: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  stats: {
    totalSales: number;
    pointsEarned: number;
    rewardsRedeemed: number;
  };
}

const DealersPage = () => {
  const { user } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    password: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      setError('');
      // Get dealers for the current client
      const response = await getClientDealers();
      
      // Map the response data to match our Dealer interface
      const mappedDealers: Dealer[] = response.map(dealer => ({
        _id: dealer._id || dealer.id || '',
        name: dealer.name,
        email: dealer.email,
        phone: dealer.phone || '',
        address: {
          city: dealer.address?.city || '',
          state: dealer.address?.state || '',
          country: dealer.address?.country || ''
        },
        status: (dealer.status as 'active' | 'inactive' | 'suspended') || 'active',
        createdAt: new Date().toISOString(), // Default value as it's not in UserData
        stats: {
          totalSales: 0,
          pointsEarned: 0,
          rewardsRedeemed: 0
        }
      }));
      
      setDealers(mappedDealers);
    } catch (err) {
      console.error('Error fetching dealers:', err);
      setError('Failed to fetch dealers');
      // Fall back to mock data in case of error
      setDealers([
        {
          _id: '1',
          name: 'Eastside Motors',
          email: 'contact@eastsidemotors.com',
          phone: '+1234567890',
          address: {
            city: 'Chicago',
            state: 'IL',
            country: 'USA'
          },
          status: 'active',
          createdAt: new Date().toISOString(),
          stats: {
            totalSales: 125000,
            pointsEarned: 8750,
            rewardsRedeemed: 5
          }
        },
        {
          _id: '2',
          name: 'Westlake Automotive',
          email: 'info@westlakeauto.com',
          phone: '+9876543210',
          address: {
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA'
          },
          status: 'active',
          createdAt: new Date().toISOString(),
          stats: {
            totalSales: 98000,
            pointsEarned: 6200,
            rewardsRedeemed: 3
          }
        },
        {
          _id: '3',
          name: 'Sunshine Dealership',
          email: 'sales@sunshinedealership.com',
          phone: '+1122334455',
          address: {
            city: 'Miami',
            state: 'FL',
            country: 'USA'
          },
          status: 'inactive',
          createdAt: new Date().toISOString(),
          stats: {
            totalSales: 75000,
            pointsEarned: 4500,
            rewardsRedeemed: 2
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (dealer: Dealer) => {
    setSelectedDealer(dealer);
  };

  const handleCreateDealer = () => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('Token available:', !!localStorage.getItem('token'));
    
    setFormMode('create');
    setFormData({
      name: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      country: '',
      password: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleEditDealer = (dealer: Dealer) => {
    setFormMode('edit');
    setFormData({
      name: dealer.name,
      email: dealer.email,
      phone: dealer.phone || '',
      city: dealer.address?.city || '',
      state: dealer.address?.state || '',
      country: dealer.address?.country || '',
      password: '',
      status: dealer.status
    });
    setSelectedDealer(dealer);
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formMode === 'create') {
        console.log('Starting dealer creation process...');
        
        if (!user) {
          throw new Error('User information not available. Please log in again.');
        }
        
        // Get organization ID from the current user
        const organizationId = user.organization?.id;
        
        console.log('Organization ID:', organizationId);
        console.log('User ID (clientId):', user.id);

        try {
          // Create the dealer with the provided form data
          await createDealer({ 
            ...formData, 
            role: 'dealer', 
            clientId: user.id,
            address: {
              city: formData.city,
              state: formData.state,
              country: formData.country
            },
            password: formData.password,
            createdByClient: true,
            organizationId: organizationId
          });
          
          toast.success('Dealer created successfully');
          setIsModalOpen(false);
          fetchDealers(); // Refresh the list
        } catch (dealerError: any) {
          console.error('Error creating dealer:', dealerError);
          const errorMessage = dealerError.message || 'Failed to create dealer. Please try again.';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } else if (selectedDealer) {
        // Update existing dealer
        await axios.put(`/api/users/${selectedDealer._id}`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: {
            city: formData.city,
            state: formData.state,
            country: formData.country
          },
          status: formData.status,
          ...(formData.password ? { password: formData.password } : {})
        });
        
        toast.success('Dealer updated successfully');
        setIsModalOpen(false);
        fetchDealers();
      }
    } catch (err: any) {
      const errorMessage = err.message || (formMode === 'create' ? 'Failed to create dealer' : 'Failed to update dealer');
      console.error('Submission error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDealer = async (dealerId: string) => {
    if (window.confirm('Are you sure you want to delete this dealer?')) {
      try {
        await deleteDealer(dealerId);
        toast.success('Dealer deleted successfully');
        fetchDealers();
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to delete dealer';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleSendLoginCredentials = async (dealer: Dealer) => {
    try {
      // API call to send login credentials to dealer via email
      await axios.post(`/api/users/${dealer._id}/send-credentials`, {
        message: `Here are your login credentials for the dealer platform:
                 Email: ${dealer.email}
                 Password: [Use the password you were given during registration]
                 Login URL: ${window.location.origin}/login`
      });
      
      toast.success(`Login details sent to ${dealer.email}`);
    } catch (err: any) {
      console.error('Error sending credentials:', err);
      toast.error(err.message || 'Failed to send login credentials');
    }
  };
  
  const handleShowLoginInfo = (dealer: Dealer) => {
    // Show modal with dealer login information
    setSelectedDealer(dealer);
    toast.success('You can now copy the login URL and send it to the dealer');
    
    // Create a modal/popup to display this information
    const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(dealer.email)}`;
    
    // You can implement a custom modal here or use a library
    // For simplicity, we'll use a basic alert for now
    alert(`Dealer Login Information:
Email: ${dealer.email}
Login URL: ${loginUrl}
Please make sure to provide the password to the dealer securely.`);
  };

  if (user?.role !== 'client') {
    return <div className="p-6">You don't have permission to access this page.</div>;
  }

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dealers Management</h1>
          <button
            onClick={handleCreateDealer}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add New Dealer
          </button>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(dealers) && dealers.map((dealer) => (
                  <tr key={dealer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {dealer.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{dealer.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dealer.email}</div>
                      <div className="text-sm text-gray-500">{dealer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {[dealer.address.city, dealer.address.state, dealer.address.country].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${dealer.status === 'active' ? 'bg-green-100 text-green-800' : 
                          dealer.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {dealer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${dealer.stats.totalSales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dealer.stats.pointsEarned.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(dealer)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditDealer(dealer)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDealer(dealer._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleShowLoginInfo(dealer)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="Show Login Info"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleSendLoginCredentials(dealer)}
                        className="text-green-600 hover:text-green-900 mr-2"
                        title="Send Login Credentials"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dealer Details Modal */}
        {selectedDealer && !isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">{selectedDealer.name}</h2>
                <button
                  onClick={() => setSelectedDealer(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Contact Information</h3>
                  <p className="mt-2">Email: {selectedDealer.email}</p>
                  <p>Phone: {selectedDealer.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Location</h3>
                  <p className="mt-2">
                    {[selectedDealer.address.city, selectedDealer.address.state, selectedDealer.address.country]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Statistics</h3>
                  <p className="mt-2">Total Sales: ${selectedDealer.stats.totalSales.toLocaleString()}</p>
                  <p>Points Earned: {selectedDealer.stats.pointsEarned.toLocaleString()}</p>
                  <p>Rewards Redeemed: {selectedDealer.stats.rewardsRedeemed}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Account Status</h3>
                  <p className="mt-2">Status: 
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${selectedDealer.status === 'active' ? 'bg-green-100 text-green-800' : 
                        selectedDealer.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {selectedDealer.status}
                    </span>
                  </p>
                  <p>Created: {new Date(selectedDealer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleEditDealer(selectedDealer)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                >
                  Edit Dealer
                </button>
                <button
                  onClick={() => setSelectedDealer(null)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Dealer Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">{formMode === 'create' ? 'Add New Dealer' : 'Edit Dealer'}</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      required
                    />
                  </div>
                  {formMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleFormChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required={formMode === 'create'}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
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
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {formMode === 'create' ? 'Create Dealer' : 'Update Dealer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
};

export default DealersPage;