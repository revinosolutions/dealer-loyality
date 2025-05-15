import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const DealerSlotsPage: React.FC = () => {
  const { user } = useAuth();
  const [dealerSlots, setDealerSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchDealerSlots = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dealer-slots');
        setDealerSlots(response.data.dealerSlots);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dealer slots');
        console.error('Error fetching dealer slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDealerSlots();
  }, []);

  const handleStatusChange = async (slotId: string, newStatus: string) => {
    try {
      await axios.put(`/api/dealer-slots/${slotId}`, { status: newStatus });
      
      setDealerSlots(slots =>
        slots.map(slot => 
          slot._id === slotId ? { ...slot, status: newStatus } : slot
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update slot status');
    }
  };

  const filteredSlots = statusFilter === 'all' 
    ? dealerSlots 
    : dealerSlots.filter(slot => slot.status === statusFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealer Slots</h1>
          <p className="text-gray-600">
            Create and manage slots for dealers from your purchased products
          </p>
        </div>
        <Link
          to="/dashboard/dealer-slots/create"
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Slot
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'inactive'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'expired'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Expired
          </button>
        </div>
      </div>

      {filteredSlots.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <p className="text-gray-500">
            {statusFilter === 'all'
              ? "You haven't created any dealer slots yet."
              : `No ${statusFilter} dealer slots found.`}
          </p>
          {statusFilter === 'all' && (
            <Link
              to="/dashboard/dealer-slots/create"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Your First Slot
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => (
            <div
              key={slot._id}
              className="bg-white shadow-md rounded-lg overflow-hidden"
            >
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-gray-800">{slot.name}</h2>
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${
                      slot.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : slot.status === 'inactive'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{slot.originalProduct?.name}</p>
              </div>
              
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Available Quantity</p>
                    <p className="text-sm font-medium text-gray-800">
                      {slot.availableQuantity} / {slot.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dealer Price</p>
                    <p className="text-sm font-medium text-gray-800">
                      ${slot.dealerPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Loyalty Points</p>
                    <p className="text-sm font-medium text-gray-800">
                      {slot.loyaltyPoints} pts
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expires</p>
                    <p className="text-sm font-medium text-gray-800">
                      {slot.expiryDate 
                        ? new Date(slot.expiryDate).toLocaleDateString() 
                        : 'No expiry'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex justify-between items-center gap-2">
                <Link
                  to={`/dashboard/dealer-slots/${slot._id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </Link>
                
                <div className="flex gap-2">
                  {slot.status === 'active' ? (
                    <button
                      onClick={() => handleStatusChange(slot._id, 'inactive')}
                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                    >
                      Deactivate
                    </button>
                  ) : slot.status === 'inactive' ? (
                    <button
                      onClick={() => handleStatusChange(slot._id, 'active')}
                      className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      Activate
                    </button>
                  ) : null}
                  
                  <Link
                    to={`/dashboard/dealer-slots/${slot._id}/edit`}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerSlotsPage; 