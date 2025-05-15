import React, { useState, useEffect } from 'react';
import { Package, Users, Award, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useInventory, InventoryItem } from '../../contexts/InventoryContext';

type AllocationFormProps = {
  availableInventory: InventoryItem[];
  availableTargets: { id: string; name: string; type: 'client' | 'dealer' }[];
  onSubmit: (data: {
    targetId: string;
    items: { productId: string; quantity: number }[];
  }) => Promise<void>;
  calculatePoints: (productId: string, quantity: number) => number;
  userRole: string;
};

const InventoryAllocationForm: React.FC<AllocationFormProps> = ({
  availableInventory,
  availableTargets,
  onSubmit,
  calculatePoints,
  userRole
}) => {
  const [selectedItems, setSelectedItems] = useState<{productId: string; quantity: number}[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [estimatedPoints, setEstimatedPoints] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate estimated points whenever selected items change
  useEffect(() => {
    let total = 0;
    selectedItems.forEach(item => {
      total += calculatePoints(item.productId, item.quantity);
    });
    setEstimatedPoints(total);
  }, [selectedItems, calculatePoints]);

  // Handle adding an item to the allocation
  const handleAddItem = (productId: string) => {
    // Check if item is already in the list
    if (selectedItems.some(item => item.productId === productId)) {
      return;
    }
    
    setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
  };

  // Handle removing an item from the allocation
  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, quantity: number) => {
    // Find the inventory item to check available quantity
    const inventoryItem = availableInventory.find(item => item.productId === productId);
    if (!inventoryItem) return;
    
    // Validate quantity
    if (quantity <= 0) {
      setFormErrors(prev => ({ ...prev, [productId]: 'Quantity must be greater than 0' }));
      return;
    }
    
    if (quantity > inventoryItem.availableQuantity) {
      setFormErrors(prev => ({ ...prev, [productId]: `Maximum available: ${inventoryItem.availableQuantity}` }));
      return;
    }
    
    // Clear error if valid
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });
    
    // Update quantity
    setSelectedItems(selectedItems.map(item => 
      item.productId === productId ? { ...item, quantity } : item
    ));
  };

  // Validate form before submission
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!selectedTarget) {
      errors.target = 'Please select a target';
    }
    
    if (selectedItems.length === 0) {
      errors.items = 'Please select at least one item';
    }
    
    // Check each item's quantity
    selectedItems.forEach(item => {
      const inventoryItem = availableInventory.find(invItem => invItem.productId === item.productId);
      if (!inventoryItem) {
        errors[item.productId] = 'Product not found';
        return;
      }
      
      if (item.quantity <= 0) {
        errors[item.productId] = 'Quantity must be greater than 0';
      } else if (item.quantity > inventoryItem.availableQuantity) {
        errors[item.productId] = `Maximum available: ${inventoryItem.availableQuantity}`;
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await onSubmit({
        targetId: selectedTarget,
        items: selectedItems
      });
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setSelectedItems([]);
      setSelectedTarget('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to allocate inventory');
      console.error('Allocation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get product name from inventory
  const getProductName = (productId: string) => {
    const product = availableInventory.find(item => item.productId === productId);
    return product?.productName || 'Unknown Product';
  };

  // Get product category from inventory
  const getProductCategory = (productId: string) => {
    const product = availableInventory.find(item => item.productId === productId);
    return product?.category || 'Unknown';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-800">
          <CheckCircle size={18} />
          <span>Inventory successfully allocated!</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Target selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {userRole === 'super_admin' ? 'Select Client' : 'Select Dealer'}
          </label>
          
          {formErrors.target && (
            <p className="text-sm text-red-600 mb-2">{formErrors.target}</p>
          )}
          
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a {userRole === 'super_admin' ? 'client' : 'dealer'}</option>
            {availableTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Available inventory */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Inventory</h3>
          
          {formErrors.items && (
            <p className="text-sm text-red-600 mb-2">{formErrors.items}</p>
          )}
          
          <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points/Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                      No inventory items available for allocation
                    </td>
                  </tr>
                ) : (
                  availableInventory.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.availableQuantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.pointsPerUnit}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleAddItem(item.productId)}
                          disabled={selectedItems.some(selected => selected.productId === item.productId)}
                          className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Selected items */}
        {selectedItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Items</h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedItems.map((item) => {
                    const points = calculatePoints(item.productId, item.quantity);
                    return (
                      <tr key={item.productId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getProductName(item.productId)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {getProductCategory(item.productId)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {formErrors[item.productId] && (
                              <span className="ml-2 text-xs text-red-600">{formErrors[item.productId]}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {points.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Estimated points */}
        {selectedItems.length > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                Estimated Loyalty Points: {estimatedPoints.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-indigo-700">
              {userRole === 'super_admin' 
                ? 'Points will be awarded to the client upon allocation.' 
                : 'Points will be awarded to the dealer upon allocation.'}
            </p>
          </div>
        )}
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={selectedItems.length === 0 || !selectedTarget || isSubmitting || Object.keys(formErrors).length > 0}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Allocating...' : 'Allocate Inventory'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryAllocationForm;