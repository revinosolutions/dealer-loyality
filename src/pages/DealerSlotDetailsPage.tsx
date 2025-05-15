import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const DealerSlotDetailsPage: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slot, setSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSlotDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/dealer-slots/${slotId}`);
        setSlot(response.data);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dealer slot details');
        console.error('Error fetching dealer slot details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slotId) {
      fetchSlotDetails();
    }
  }, [slotId]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="container mx-auto px-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Dealer slot not found
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{slot.name}</h1>
          <p className="text-gray-600">
            {slot.originalProduct?.name} | {slot.status}
          </p>
        </div>
        
        {user?.role === 'client' && slot.clientId === user.id && (
          <div className="mt-4 md:mt-0 flex gap-2">
            <Link
              to={`/dashboard/dealer-slots/${slot._id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Slot
            </Link>
            {slot.status === 'active' ? (
              <button
                onClick={async () => {
                  try {
                    await axios.put(`/api/dealer-slots/${slot._id}`, { status: 'inactive' });
                    setSlot({...slot, status: 'inactive'});
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to update status');
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Deactivate
              </button>
            ) : slot.status === 'inactive' ? (
              <button
                onClick={async () => {
                  try {
                    await axios.put(`/api/dealer-slots/${slot._id}`, { status: 'active' });
                    setSlot({...slot, status: 'active'});
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to update status');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Activate
              </button>
            ) : null}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Slot Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`text-sm font-medium ${
                    slot.status === 'active' ? 'text-green-600' : 
                    slot.status === 'inactive' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Dealer Price</p>
                  <p className="text-sm font-medium text-gray-900">${slot.dealerPrice}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Loyalty Points</p>
                  <p className="text-sm font-medium text-green-600">+{slot.loyaltyPoints} pts</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Available Quantity</p>
                  <p className="text-sm font-medium text-gray-900">{slot.availableQuantity} / {slot.quantity}</p>
                </div>
                
                {slot.expiryDate && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Expires On</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(slot.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              
              {slot.description && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-sm text-gray-700 mt-1">{slot.description}</p>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Original Product</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Product Name</p>
                  <p className="text-sm font-medium text-gray-900">{slot.originalProduct?.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">SKU</p>
                  <p className="text-sm font-medium text-gray-900">{slot.originalProduct?.sku}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900">{slot.originalProduct?.category}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Original Price</p>
                  <p className="text-sm font-medium text-gray-900">${slot.originalProduct?.price}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Original Points</p>
                  <p className="text-sm font-medium text-gray-900">{slot.originalProduct?.loyaltyPoints} pts</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Redemption Rules */}
          {slot.redemptionRules && slot.redemptionRules.pointsRequired > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Redemption Rules</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Points Required</p>
                  <p className="text-sm font-medium text-gray-900">{slot.redemptionRules.pointsRequired} pts per unit</p>
                </div>
                
                {slot.redemptionRules.discountPercentage > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Discount Percentage</p>
                    <p className="text-sm font-medium text-gray-900">{slot.redemptionRules.discountPercentage}%</p>
                  </div>
                )}
                
                {slot.redemptionRules.additionalBenefits && slot.redemptionRules.additionalBenefits.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Additional Benefits</p>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {slot.redemptionRules.additionalBenefits.map((benefit: string, index: number) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Go Back
              </button>
              
              {user?.role === 'dealer' && slot.status === 'active' && slot.availableQuantity > 0 && (
                <button
                  onClick={() => navigate(`/dashboard/dealer-catalog/${slot._id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View in Catalog
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerSlotDetailsPage; 