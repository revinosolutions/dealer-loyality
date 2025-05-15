import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  loyaltyPoints: number;
  availableToAllocate: number;
}

interface RedemptionRules {
  pointsRequired: number;
  discountPercentage: number;
  additionalBenefits: string[];
}

const CreateDealerSlotPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    originalProduct: '',
    quantity: 1,
    dealerPrice: 0,
    loyaltyPoints: 0,
    expiryDate: '',
    status: 'active',
    redemptionRules: {
      pointsRequired: 0,
      discountPercentage: 0,
      additionalBenefits: ['']
    }
  });

  // Selected product details
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchClientInventory = async () => {
      try {
        setInventoryLoading(true);
        const response = await axios.get('/api/client-orders/inventory/summary');
        
        // Filter only products with available inventory
        const availableProducts = response.data.filter(
          (product: any) => product.available > 0
        );
        
        setInventory(availableProducts);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch your inventory');
        console.error('Error fetching inventory:', err);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchClientInventory();
  }, []);

  // Update selected product when originalProduct changes
  useEffect(() => {
    if (formData.originalProduct) {
      const product = inventory.find(p => p._id === formData.originalProduct);
      if (product) {
        setSelectedProduct(product);
        
        // Update default price and loyalty points based on the selected product
        setFormData(prevData => ({
          ...prevData,
          dealerPrice: product.price,
          loyaltyPoints: product.loyaltyPoints
        }));
      }
    } else {
      setSelectedProduct(null);
    }
  }, [formData.originalProduct, inventory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value);
    if (!isNaN(quantity) && quantity > 0) {
      if (selectedProduct && quantity > selectedProduct.availableToAllocate) {
        setError(`You only have ${selectedProduct.availableToAllocate} units available.`);
      } else {
        setError('');
      }
      
      setFormData(prevData => ({
        ...prevData,
        quantity
      }));
    }
  };

  const handleRedemptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'pointsRequired' || name === 'discountPercentage' 
      ? parseInt(value) 
      : value;
    
    setFormData(prevData => ({
      ...prevData,
      redemptionRules: {
        ...prevData.redemptionRules,
        [name]: numValue
      }
    }));
  };

  const handleBenefitChange = (index: number, value: string) => {
    const updatedBenefits = [...formData.redemptionRules.additionalBenefits];
    updatedBenefits[index] = value;
    
    setFormData(prevData => ({
      ...prevData,
      redemptionRules: {
        ...prevData.redemptionRules,
        additionalBenefits: updatedBenefits
      }
    }));
  };

  const addBenefit = () => {
    setFormData(prevData => ({
      ...prevData,
      redemptionRules: {
        ...prevData.redemptionRules,
        additionalBenefits: [...prevData.redemptionRules.additionalBenefits, '']
      }
    }));
  };

  const removeBenefit = (index: number) => {
    const updatedBenefits = [...formData.redemptionRules.additionalBenefits];
    updatedBenefits.splice(index, 1);
    
    setFormData(prevData => ({
      ...prevData,
      redemptionRules: {
        ...prevData.redemptionRules,
        additionalBenefits: updatedBenefits
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      setError('Slot name is required');
      return;
    }
    
    if (!formData.originalProduct) {
      setError('Please select a product');
      return;
    }
    
    if (selectedProduct && formData.quantity > selectedProduct.availableToAllocate) {
      setError(`You only have ${selectedProduct.availableToAllocate} units available.`);
      return;
    }

    try {
      setLoading(true);
      
      // Clean up additional benefits by removing empty entries
      const cleanedBenefits = formData.redemptionRules.additionalBenefits.filter(
        benefit => benefit.trim() !== ''
      );
      
      const payload = {
        ...formData,
        redemptionRules: {
          ...formData.redemptionRules,
          additionalBenefits: cleanedBenefits
        }
      };
      
      await axios.post('/api/dealer-slots', payload);
      
      navigate('/dashboard/dealer-slots');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create dealer slot');
      console.error('Error creating dealer slot:', err);
    } finally {
      setLoading(false);
    }
  };

  if (inventoryLoading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Dealer Slot</h1>
        <p className="text-gray-600">
          Create a new slot from your purchased products for dealers to purchase
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">
            You don't have any products available in your inventory to create dealer slots.
          </p>
          <a
            href="/dashboard/inventory"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Your Inventory
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Slot Name*
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Select Product*
              </label>
              <select
                name="originalProduct"
                value={formData.originalProduct}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select a product --</option>
                {inventory.map(product => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.availableToAllocate} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Quantity*
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleQuantityChange}
                min="1"
                max={selectedProduct?.availableToAllocate || 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  You have {selectedProduct.availableToAllocate} units available.
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for no expiry
              </p>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Dealer Price*
              </label>
              <input
                type="number"
                name="dealerPrice"
                value={formData.dealerPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  Original price: ${selectedProduct.price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Loyalty Points*
              </label>
              <input
                type="number"
                name="loyaltyPoints"
                value={formData.loyaltyPoints}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  Original points: {selectedProduct.loyaltyPoints} pts
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Redemption Rules (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Points Required to Redeem
                </label>
                <input
                  type="number"
                  name="pointsRequired"
                  value={formData.redemptionRules.pointsRequired}
                  onChange={handleRedemptionChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of loyalty points required per unit
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.redemptionRules.discountPercentage}
                  onChange={handleRedemptionChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  % discount when points are redeemed
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-medium">
                  Additional Benefits
                </label>
                <button
                  type="button"
                  onClick={addBenefit}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Benefit
                </button>
              </div>
              
              {formData.redemptionRules.additionalBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                    placeholder="e.g., Free delivery"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard/dealer-slots')}
              className="px-4 py-2 mr-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Dealer Slot'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateDealerSlotPage; 