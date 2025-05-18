import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, RefreshCw, AlertCircle, Edit, Plus, Minus, Save, X, Truck, BarChart, ShoppingCart, UploadCloud, Check, Clipboard, Terminal } from 'lucide-react';
import { getProducts, Product, updateProductInventory } from '../services/productsApi';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface InventoryEditState {
  productId: string;
  currentStock: number;
  reorderLevel?: number;
  reservedStock?: number;
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [editingInventory, setEditingInventory] = useState<InventoryEditState | null>(null);
  const [savingInventory, setSavingInventory] = useState(false);

  // Initial fetch of inventory data when component mounts
  useEffect(() => {
    console.log('InventoryPage mounted, loading inventory...');
    try {
      // Check for force refresh flag from other pages
      const forceRefresh = localStorage.getItem('forceInventoryRefresh');
      if (forceRefresh === 'true') {
        console.log('Force refresh flag detected, clearing and forcing fresh inventory data');
        localStorage.removeItem('forceInventoryRefresh'); // Clear flag
        // Clear any existing inventory in state
        setInventory([]);
      }
      
      // Check user authentication
      if (!user) {
        console.log('No user found, waiting for auth...');
      } else {
        console.log('User found, fetching inventory for:', { 
          id: user.id, 
          role: user.role,
          organization: user.organization?.id 
        });
        // Always force fresh data on initial load and when coming from another page with forceRefresh
        fetchInventory(true);
      }
    } catch (err) {
      console.error('Error during initial inventory fetch:', err);
    }
  }, []);

  // Also refresh when user changes
  useEffect(() => {
    console.log('User context changed, refreshing inventory with user:', user?.id, user?.role);
    if (user && user.id) {
      console.log('User authenticated, requesting inventory fetch...');
      fetchInventory(true); // Force fresh data when user changes
    }
  }, [user?.id, user?.role]);

  // Force-check the URL path to make sure we're on the right page
  useEffect(() => {
    const checkPath = () => {
      // Get the current path
      const currentPath = window.location.pathname;
      console.log('Current path:', currentPath);
      
      // Check if we're on the inventory page
      if (currentPath.includes('/dashboard/inventory')) {
        console.log('On inventory page, refreshing data...');
        fetchInventory();
      }
    };
    
    // Check path on mount and when URL changes
    checkPath();
    
    // Add event listener for popstate (browser back/forward)
    window.addEventListener('popstate', checkPath);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('popstate', checkPath);
    };
  }, []);

  // Add a new useEffect hook to listen for inventory updates from other components
  useEffect(() => {
    fetchInventory();
    
    // Listen for inventory update events
    const INVENTORY_UPDATE_EVENT = 'inventory-updated';
    
    // Handler function for the inventory update event
    const handleInventoryUpdate = () => {
      console.log('[INVENTORY_PAGE] Received inventory update event - refreshing data');
      fetchInventory(true); // Force fresh data
    };
    
    window.addEventListener(INVENTORY_UPDATE_EVENT, handleInventoryUpdate);
    
    // Listen for direct inventory fix events
    const handleDirectInventoryLoad = (event: any) => {
      console.log('[INVENTORY_PAGE] Direct inventory loaded event received:', event.detail);
      if (event.detail && event.detail.products) {
        setInventory(event.detail.products);
        toast.success(`Loaded ${event.detail.count} products directly`);
      }
    };
    
    window.addEventListener('direct-inventory-loaded', handleDirectInventoryLoad);
    
    // Clean up event listeners when component unmounts
    return () => {
      window.removeEventListener(INVENTORY_UPDATE_EVENT, handleInventoryUpdate);
      window.removeEventListener('direct-inventory-loaded', handleDirectInventoryLoad);
    };
  }, []);  // Empty dependency array means this only runs once on mount

  const fetchInventory = async (forceFresh = false) => {
    console.log(`[INVENTORY_PAGE] Starting inventory fetch (forceFresh: ${forceFresh})`);
    setLoading(true);
    try {
      if (user?.role === 'admin') {
        console.log('[INVENTORY_PAGE] Fetching admin inventory, no filters');
        
        const response = await getProducts({
          _t: Date.now() // Always add timestamp to prevent caching
        });
        
        console.log('[INVENTORY_PAGE] Admin inventory fetched, product count:', response.products?.length);
        
        if (!response.products || response.products.length === 0) {
          console.log('[INVENTORY_PAGE] No inventory items found for admin');
          setInventory([]);
        } else {
          // Sample data check for debugging
          if (response.products.length > 0) {
            const sample = response.products[0];
            console.log('[INVENTORY_PAGE] Sample product data:', {
              id: sample._id,
              name: sample.name,
              stock: sample.stock,
              type: typeof sample.stock,
              reorderLevel: sample.reorderLevel,
              updatedAt: sample.updatedAt
            });
          }
          
          // No additional filtering needed - show all products for admin
          setInventory(response.products);
          console.log(`[INVENTORY_PAGE] Set inventory state with ${response.products.length} products`);
        }
      } else if (user?.role === 'client') {
        // For client roles: Try more aggressive direct approaches
        console.log('[INVENTORY_PAGE] Fetching client inventory with direct approaches');
        
        const clientId = user.id;
        console.log('[INVENTORY_PAGE] Client ID for inventory lookup:', clientId);
        
        // Store all products found
        const allClientProducts = [];
        let errors = 0;
        
        try {
          // APPROACH 1: Use the most inclusive search with multiple parameters
          console.log('[INVENTORY_PAGE] APPROACH 1: Direct inclusive client inventory query with multiple params');
          const randomParam = Math.floor(Math.random() * 10000);  // Add randomness to defeat caching
          const requestFilters = {
            hasClientInventory: true,
            clientId,
            forceRefresh: forceFresh ? 'true' : 'false', 
            _t: Date.now() + randomParam  // Force cache bypass
          };
          
          console.log('[INVENTORY_PAGE] Using filters:', JSON.stringify(requestFilters));
          
          const response1 = await getProducts(requestFilters);
          
          if (response1?.products?.length > 0) {
            console.log(`[INVENTORY_PAGE] Found ${response1.products.length} products with client inventory`);
            console.log('[INVENTORY_PAGE] Sample product data:', JSON.stringify(response1.products[0]));
            allClientProducts.push(...response1.products);
          } else {
            console.log('[INVENTORY_PAGE] No products found with first approach');
          }
        } catch (err) {
          console.error('[INVENTORY_PAGE] Error with APPROACH 1:', err);
          errors++;
        }
        
        // If no products found with first approach, try another approach
        if (allClientProducts.length === 0) {
          try {
            // APPROACH 2: Try with just clientId parameter
            console.log('[INVENTORY_PAGE] APPROACH 2: Try with just clientId');
            const response2 = await getProducts({
              clientId,
              _t: Date.now() + Math.random()
            });
            
            if (response2?.products?.length > 0) {
              console.log(`[INVENTORY_PAGE] Found ${response2.products.length} products with APPROACH 2`);
              allClientProducts.push(...response2.products);
            } else {
              console.log('[INVENTORY_PAGE] No products found with second approach');
            }
          } catch (err) {
            console.error('[INVENTORY_PAGE] Error with APPROACH 2:', err);
            errors++;
          }
        }
        
        // Log all products found
        if (allClientProducts.length === 0) {
          console.log('[INVENTORY_PAGE] No client products found with standard approaches');
          
          // Force a direct DB query with debug mode
          try {
            console.log('[INVENTORY_PAGE] LAST RESORT: Direct API call with debug');
            const debugResponse = await fetch(`/api/products/debug-client-inventory?clientId=${clientId}&_t=${Date.now()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              console.log(`[INVENTORY_PAGE] Direct debug query found ${debugData.products?.length || 0} products`);
              console.log('[INVENTORY_PAGE] Debug data sample:', debugData.products?.length > 0 ? JSON.stringify(debugData.products[0]) : 'No products');
              if (debugData.products?.length > 0) {
                allClientProducts.push(...debugData.products);
              }
            }
          } catch (debugErr) {
            console.error('[INVENTORY_PAGE] Debug query failed:', debugErr);
          }
        }
        
        // Sort and set inventory
        if (allClientProducts.length > 0) {
          console.log(`[INVENTORY_PAGE] Total client products found: ${allClientProducts.length}`);
          
          // Add clientInventory property to all products if missing
          const processedProducts = allClientProducts.map(product => {
            if (!product.clientInventory) {
              console.log(`[INVENTORY_PAGE] Adding clientInventory to product ${product._id}`);
              return {
                ...product,
                clientInventory: {
                  initialStock: product.stock || 0,
                  currentStock: product.stock || 0,
                  reorderLevel: product.reorderLevel || 5,
                  lastUpdated: product.updatedAt || new Date().toISOString()
                }
              };
            }
            return product;
          });
          
          processedProducts.sort((a, b) => a.name.localeCompare(b.name));
          setInventory(processedProducts);
          console.log(`[INVENTORY_PAGE] Set inventory state with ${processedProducts.length} processed client products`);
        } else {
          console.log('[INVENTORY_PAGE] No client products found after all attempts');
          setInventory([]);
        }
      } else {
        // For other roles: don't show inventory
        console.log('[INVENTORY_PAGE] Non-client/admin role - no inventory access');
        setInventory([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('[INVENTORY_PAGE] Error fetching inventory:', err);
      setError('Failed to load inventory. Please try again later.');
      setInventory([]);
    } finally {
      setLoading(false);
      console.log('[INVENTORY_PAGE] Finished inventory fetch');
    }
  };

  const startEditingInventory = (product: Product) => {
    console.log('Starting to edit product:', product);
    
    setEditingInventory({
      productId: product._id || '',
      currentStock: product.stock || 0,
      reorderLevel: product.reorderLevel || 5,
      reservedStock: product.reservedStock || 0
    });
  };

  const cancelEditing = () => {
    setEditingInventory(null);
  };

  const updateStock = async () => {
    if (!editingInventory) return;

    setSavingInventory(true);
    try {
      console.log(`[INVENTORY_PAGE] Updating stock for product ${editingInventory.productId}`);
      
      // Update regular product inventory
      console.log('[INVENTORY_PAGE] Updating regular product inventory with:', {
        currentStock: editingInventory.currentStock,
        reorderLevel: editingInventory.reorderLevel,
        reservedStock: editingInventory.reservedStock
      });
    
      // Call the API to update the product - use currentStock instead of stock
      const updatedProduct = await updateProductInventory(editingInventory.productId, {
        currentStock: editingInventory.currentStock,
        reorderLevel: editingInventory.reorderLevel,
        reservedStock: editingInventory.reservedStock
      });
      
      console.log('[INVENTORY_PAGE] Server update response:', updatedProduct);

      // Update local state
      setInventory(prev => prev.map(product => {
        if (product._id === editingInventory.productId) {
          console.log(`[INVENTORY_PAGE] Updating product ${product.name} in state. Old stock: ${product.stock}, new stock: ${editingInventory.currentStock}`);
          return {
            ...product,
            stock: updatedProduct.stock, // Use the server-returned value instead of the local state value
            reorderLevel: updatedProduct.reorderLevel,
            reservedStock: updatedProduct.reservedStock,
            updatedAt: updatedProduct.updatedAt || new Date().toISOString()
          };
        }
        return product;
      }));

      toast.success('Inventory updated successfully');

      // Close the editing modal
      setEditingInventory(null);
      
      // Always force a complete refresh of inventory data to ensure we have the latest from the server
      console.log('[INVENTORY_PAGE] Performing full inventory refresh after update');
      await fetchInventory();
    } catch (error) {
      console.error('[INVENTORY_PAGE] Failed to update inventory:', error);
      toast.error('Failed to update inventory. Please try again.');
    } finally {
      setSavingInventory(false);
    }
  };

  const changeStockValue = (value: number) => {
    if (!editingInventory) return;
    
    setEditingInventory({
      ...editingInventory,
      currentStock: Math.max(0, editingInventory.currentStock + value)
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStockStatusClass = (product: Product) => {
    const stock = product.stock;
    const reorderLevel = product.reorderLevel || 5;
    return stock <= 0 ? 'text-red-600' : stock <= reorderLevel ? 'text-orange-500' : 'text-green-600';
  };

  const getStockLabel = (product: Product) => {
    const stock = product.stock;
    const reorderLevel = product.reorderLevel || 5;
    
    if (stock <= 0) {
      return (
        <span className="flex items-center text-red-600">
          <AlertCircle size={16} className="mr-1" />
          Out of stock
        </span>
      );
    } else if (stock <= reorderLevel) {
      return (
        <span className="flex items-center text-orange-500">
          <AlertCircle size={16} className="mr-1" />
          Low stock
        </span>
      );
    }
    return (
      <span className="flex items-center text-green-600">
        <Package size={16} className="mr-1" />
        In stock
      </span>
    );
  };

  const runDirectFix = () => {
    toast.loading("Fixing inventory display...");
    
    const script = document.createElement('script');
    script.src = '/direct-client-inventory.js?t=' + Date.now();
    script.async = true;
    document.body.appendChild(script);
    
    // Remove script after execution
    script.onload = () => {
      document.body.removeChild(script);
      toast.dismiss();
      toast.success("Inventory fix applied");
    };
    
    script.onerror = () => {
      document.body.removeChild(script);
      toast.dismiss();
      toast.error("Failed to load inventory fix script");
    };
  };

  const renderAdminView = () => {
    // Function to open inventory management for a product
    const openManageInventoryModal = (product: any) => {
      toast.success(`Managing inventory for ${product.name}`);
      window.location.href = `/dashboard/inventory-management?product=${product._id}`;
    };
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyalty Points</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} className="h-10 w-10 object-cover rounded-full" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Package size={20} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatCurrency(product.price)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.loyaltyPoints}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingInventory && editingInventory.productId === product._id ? (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => changeStockValue(-1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                      >
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number" 
                        value={editingInventory.currentStock}
                        onChange={(e) => setEditingInventory({...editingInventory, currentStock: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-16 text-center border border-gray-300 rounded p-1"
                      />
                      <button 
                        onClick={() => changeStockValue(1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">{product.stock}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusClass(product)}`}>
                    {getStockLabel(product)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {editingInventory && editingInventory.productId === product._id ? (
                      <>
                        <button
                          onClick={updateStock}
                          className="text-green-600 hover:text-green-900"
                          title="Save Changes"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditingInventory(product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Adjust Inventory"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => openManageInventoryModal(product)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Manage Inventory"
                        >
                          <Clipboard size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderClientInventory = () => {
    console.log('[CLIENT-INVENTORY] Rendering client inventory with inventory state:', JSON.stringify(inventory.slice(0, 1))); // Log just first item to avoid console flood
    console.log('[CLIENT-INVENTORY] Inventory contains', inventory.length, 'products');
    
    // First, attempt to fix the inventory data if it exists but isn't displaying properly
    const processedInventory = inventory.map(product => {
      console.log(`[CLIENT-INVENTORY] Processing product: ${product.name || 'Unnamed product'}`, 
                  JSON.stringify({
                    id: product._id,
                    name: product.name,
                    stock: product.stock,
                    hasClientInventory: !!product.clientInventory,
                    clientStock: product.clientInventory?.currentStock
                  }));
      
      // Create a fixed product with guaranteed inventory data
      return {
        ...product,
        // Ensure clientInventory exists
        clientInventory: product.clientInventory || {
          initialStock: product.stock || 0,
          currentStock: product.stock || 0,
          reorderLevel: product.reorderLevel || 5,
          lastUpdated: product.updatedAt || new Date().toISOString()
        },
        // Ensure stock is non-zero if possible
        stock: product.stock || 
               (product.clientInventory?.currentStock) || 
               (product.clientInventory?.initialStock) || 
               0
      };
    });
    
    // Log the processed data after mapping
    console.log('[CLIENT-INVENTORY] Processed inventory data:', 
      processedInventory.length > 0 ? 
        JSON.stringify(processedInventory.slice(0, 1)) : 'No products');
    
    if (inventory.length === 0) {
      console.log('[CLIENT-INVENTORY] No inventory found - showing empty state');
      
      // Get client ID for direct repair
      const clientId = user?.id;
      
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <Package className="h-16 w-16 text-gray-400 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Your Inventory is Empty</h3>
        <p className="mt-2 text-gray-500">
            You don't have any items in your inventory yet. Your inventory will be updated once your purchase requests are approved.
          </p>
          <div className="mt-6 flex flex-col gap-4 items-center">
            <button 
              onClick={() => fetchInventory(true)} 
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh Inventory
            </button>
            
            <button 
              onClick={runDirectFix} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              <Terminal size={16} />
              Fix Inventory Display
            </button>
            
            <a 
              href={`/api/products/debug-client-inventory?clientId=${clientId}&_t=${Date.now()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Debug API Access Link
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-600">
          <p className="mb-2"><strong>Debug Info:</strong> Displaying {processedInventory.length} products in client inventory</p>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchInventory(true)} 
              className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} />
              Force Refresh
            </button>
            
            <button 
              onClick={runDirectFix}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 text-sm"
            >
              <Terminal size={14} />
              Direct Fix
            </button>
            
            <button 
              onClick={() => {
                const clientId = user?.id;
                if (clientId) {
                  window.open(`/api/products/debug-client-inventory?clientId=${clientId}&_t=${Date.now()}`, '_blank');
                }
              }} 
              className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-2 text-sm"
            >
              <AlertCircle size={14} />
              Debug
            </button>
          </div>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedInventory.map((product) => {
              // Debug each product's inventory fields
              console.log(`[CLIENT-INVENTORY] Rendering product: ${product.name}, ID: ${product._id}`);
              
              // Get the actual stock value from the most reliable source
              const stockValue = product.clientInventory?.currentStock !== undefined ? 
                product.clientInventory.currentStock : 
                (product.isClientUploaded ? product.stock : 0);
                
              const lastUpdated = product.clientInventory?.lastUpdated ? 
                new Date(product.clientInventory.lastUpdated) : 
                (product.updatedAt ? new Date(product.updatedAt) : null);
                
              return (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="h-10 w-10 object-cover rounded-full" />
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Package size={20} className="text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name || 'Unnamed Product'}</div>
                        <div className="text-sm text-gray-500">{product.sku || 'No SKU'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.category || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(product.price || 0)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">
                      {stockValue || 0} units
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.clientInventory?.reorderLevel ?? 5} units
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {lastUpdated ? lastUpdated.toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {product.clientInventory ? 
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Client Inventory</span> : 
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Regular Stock</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderClientAccessDenied = () => {
    // Use the new client inventory view instead
    return renderClientInventory();
  };

  if (!user) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle size={48} className="mx-auto text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-yellow-800">Authentication Required</h3>
        <p className="mt-1 text-yellow-600">Please log in to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle size={48} className="mx-auto text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-red-800">Error Loading Inventory</h3>
        <p className="mt-1 text-red-600">{error}</p>
        <button 
          onClick={() => fetchInventory(true)}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
          <button 
          onClick={() => fetchInventory(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh Inventory
          </button>
      </div>
      
      {user.role === 'admin' ? renderAdminView() : renderClientInventory()}
    </div>
  );
};

export default InventoryPage; 