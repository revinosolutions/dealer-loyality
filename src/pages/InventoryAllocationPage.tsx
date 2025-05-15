import React, { useState, useEffect } from 'react';
import { Package, Users, Award, ArrowRight, Plus, CheckCircle, AlertCircle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useInventory, InventoryItem, InventoryAllocation } from '../contexts/InventoryContext';
import InventoryAllocationForm from '../components/inventory/InventoryAllocationForm';

type AllocationFormData = {
  targetId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
};

type Target = {
  id: string;
  name: string;
  type: 'client' | 'dealer';
};

const InventoryAllocationPage = () => {
  const { user } = useAuth();
  const { inventory, allocations, allocateInventory, calculateLoyaltyPoints, loading } = useInventory();
  
  const [availableTargets, setAvailableTargets] = useState<Target[]>([]);
  const [success, setSuccess] = useState<boolean>(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Empty targets array - removed mock data
  useEffect(() => {
    if (user?.role === 'admin') {
      // Admin can allocate to clients - empty array now
      setAvailableTargets([]);
    } else if (user?.role === 'client') {
      // Clients can allocate to dealers - empty array now
      setAvailableTargets([]);
    }
  }, [user]);

  // Filter inventory to show only items with available quantity
  const availableInventory = inventory.filter(item => item.availableQuantity > 0);

  // Handle form submission
  const handleAllocationSubmit = async (data: {
    targetId: string;
    items: { productId: string; quantity: number }[];
  }) => {
    try {
      setSuccess(false);
      setAllocationError(null);
      
      // Find target details
      const target = availableTargets.find(t => t.id === data.targetId);
      if (!target) {
        throw new Error('Invalid target selected');
      }
      
      // Prepare allocation data
      const allocationData = {
        sourceId: user?.id || '',
        sourceName: user?.name || '',
        targetId: target.id,
        targetName: target.name,
        items: data.items.map(item => {
          const inventoryItem = inventory.find(invItem => invItem.productId === item.productId);
          return {
            productId: item.productId,
            productName: inventoryItem?.productName || '',
            quantity: item.quantity,
            pointsAwarded: 0 // This will be calculated in the context
          };
        }),
        totalPoints: 0 // This will be calculated in the context
      };
      
      // Submit allocation
      await allocateInventory(allocationData);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setAllocationError(err instanceof Error ? err.message : 'Failed to allocate inventory');
      console.error('Allocation error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Allocation</h1>
          <p className="text-gray-600">
            {user?.role === 'admin' 
              ? 'Allocate inventory to clients and manage loyalty points.' 
              : 'Allocate inventory to dealers and manage loyalty points.'}
          </p>
        </div>
        
        {/* Success message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">Inventory allocated successfully!</h3>
              <p className="text-green-700 text-sm">The inventory has been allocated and loyalty points have been awarded.</p>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {allocationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error allocating inventory</h3>
              <p className="text-red-700 text-sm">{allocationError}</p>
            </div>
          </div>
        )}

        {/* Allocation Form */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">New Allocation</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select items from your inventory to allocate to {user?.role === 'admin' ? 'clients' : 'dealers'}.  
              </p>
            </div>
            
            <InventoryAllocationForm
              availableInventory={availableInventory}
              availableTargets={availableTargets}
              onSubmit={handleAllocationSubmit}
              calculatePoints={calculateLoyaltyPoints}
              userRole={user?.role || ''}
            />
          </div>
        </div>
        
        {/* Recent Allocations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Allocations</h2>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading allocations...</div>
            ) : allocations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No allocations found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allocations.map((allocation) => (
                      <tr key={allocation._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(allocation.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{allocation.targetName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{allocation.items.length} products</div>
                          <div className="text-xs text-gray-500">
                            {allocation.items.slice(0, 2).map(item => item.productName).join(', ')}
                            {allocation.items.length > 2 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Award className="h-4 w-4 text-indigo-500 mr-1" />
                            {allocation.totalPoints.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            allocation.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : allocation.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default InventoryAllocationPage;