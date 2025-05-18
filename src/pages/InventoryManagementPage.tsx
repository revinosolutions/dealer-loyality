import React, { useEffect, useState } from 'react';
import { useInventory, InventoryItem } from '../contexts/InventoryContext';
import { Search, Filter, Plus, Edit, ArrowUp, ArrowDown, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getProducts, Product, updateProductInventory } from '../services/productsApi';
import { useAuth } from '../contexts/AuthContext';

// Inventory adjustment component
const InventoryAdjustmentForm = ({ 
  item, 
  onSave, 
  onCancel 
}: { 
  item: InventoryItem, 
  onSave: (adjustments: Partial<InventoryItem>) => void, 
  onCancel: () => void 
}) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [reorderLevel, setReorderLevel] = useState(item.reorderLevel);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [location, setLocation] = useState(item.location);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!adjustmentReason && quantity !== item.quantity) {
      toast.error('Please provide a reason for quantity adjustment');
      return;
    }
    
    // Create adjustment object
    const adjustments: Partial<InventoryItem> = {
      quantity,
      availableQuantity: quantity,
      reorderLevel,
      location
    };
    
    onSave(adjustments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantity
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            name="quantity"
            id="quantity"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="button"
              onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
              className="p-1 text-gray-400 hover:text-gray-500"
            >
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => setQuantity(prev => prev + 1)}
              className="p-1 text-gray-400 hover:text-gray-500"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div>
        <label htmlFor="reorderLevel" className="block text-sm font-medium text-gray-700">
          Reorder Level
        </label>
        <input
          type="number"
          name="reorderLevel"
          id="reorderLevel"
          min="0"
          value={reorderLevel}
          onChange={(e) => setReorderLevel(Number(e.target.value))}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          name="location"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      
      {quantity !== item.quantity && (
        <div>
          <label htmlFor="adjustmentReason" className="block text-sm font-medium text-gray-700">
            Reason for Adjustment <span className="text-red-500">*</span>
          </label>
          <textarea
            name="adjustmentReason"
            id="adjustmentReason"
            rows={2}
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            required={quantity !== item.quantity}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Explain why you're adjusting the inventory"
          />
        </div>
      )}
      
      {quantity !== item.quantity && (
        <div className="px-4 py-3 bg-yellow-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Attention</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {quantity > item.quantity 
                    ? `You are adding ${quantity - item.quantity} units to inventory.` 
                    : `You are removing ${item.quantity - quantity} units from inventory.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

// Add type definition for inventory adjustment modal
interface AdjustmentModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (adjustments: Partial<InventoryItem>) => void;
  isOpen: boolean;
}

const InventoryManagementPage: React.FC = () => {
  const { inventory: contextInventory, loading, error, getInventory, updateInventoryItem } = useInventory();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [productToManage, setProductToManage] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  
  // If user is a client, render empty inventory message instead
  if (user?.role === 'client') {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="flex justify-center">
          <Search className="h-16 w-16 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Your Inventory is Empty</h3>
        <p className="mt-2 text-gray-500">
          You don't have any items in your inventory.
        </p>
      </div>
    );
  }
  
  // Sync inventory with context inventory
  useEffect(() => {
    if (contextInventory.length > 0) {
      setInventory(contextInventory);
    }
  }, [contextInventory]);
  
  // Parse the query parameters to get the product ID
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const productId = searchParams.get('product');
    
    if (productId) {
      loadProductDetails(productId);
    } else {
      // Only load general inventory if not focusing on a specific product
      getInventory();
    }
  }, [location]);
  
  // When a product is loaded from URL, add it to inventory if needed
  useEffect(() => {
    if (productToManage && inventory.length > 0) {
      // Check if the product is already in the inventory
      const existingItem = inventory.find(item => item.id === productToManage._id);
      
      if (!existingItem && selectedItem) {
        // If product is not in inventory but we have a selected item, update the inventory list
        setInventory(prevInventory => [...prevInventory, selectedItem]);
      }
    }
  }, [productToManage, selectedItem, inventory]);
  
  // Load product details if a specific productId is provided
  const loadProductDetails = async (productId: string) => {
    setLoadingProduct(true);
    try {
      // Fetch the specific product
      const response = await getProducts({ _id: productId });
      
      if (response.products && response.products.length > 0) {
        const product = response.products[0];
        setProductToManage(product);
        
        // Convert to inventory item format and select it
        const inventoryItem: InventoryItem = {
          id: product._id || '',
          productId: product._id || '',
          productName: product.name,
          productSku: product.sku,
          category: product.category || 'Uncategorized',
          quantity: product.stock || 0,
          availableQuantity: product.stock || 0,
          reservedQuantity: product.reservedStock || 0,
          reorderLevel: product.reorderLevel || 5,
          status: product.stock === 0 
            ? 'out_of_stock' 
            : product.stock <= (product.reorderLevel || 5)
              ? 'low_stock' 
              : 'in_stock',
          location: 'Main Warehouse',
          lastUpdated: product.updatedAt || new Date().toISOString()
        };
        
        setSelectedItem(inventoryItem);
        setIsAdjustmentModalOpen(true);
      } else {
        toast.error('Product not found');
        navigate('/dashboard/inventory');
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    getInventory();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];
  const statuses = ['all', 'in_stock', 'low_stock', 'out_of_stock'];

  const handleAdjustInventory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = async (adjustments: Partial<InventoryItem>) => {
    if (!selectedItem) return;
    
    try {
      await updateInventoryItem(selectedItem.id, adjustments);
      setIsAdjustmentModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error adjusting inventory:', err);
    }
  };

  const refreshInventory = () => {
    getInventory();
    toast.success('Inventory refreshed');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="ml-2 text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  if (error && inventory.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
        <button 
          onClick={getInventory}
          className="ml-auto bg-red-100 px-3 py-1 rounded-md text-red-800 text-sm font-medium hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and track your product inventory
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={refreshInventory}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <Link 
            to="/dashboard/admin-products"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name or SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' 
                    ? 'All Statuses' 
                    : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)
                  }
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-green-500">
          <h3 className="text-lg font-medium text-gray-900">In Stock</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {inventory.filter(item => item.status === 'in_stock').length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Products with sufficient inventory
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-yellow-500">
          <h3 className="text-lg font-medium text-gray-900">Low Stock</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {inventory.filter(item => item.status === 'low_stock').length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Products below reorder level
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border-t-4 border-red-500">
          <h3 className="text-lg font-medium text-gray-900">Out of Stock</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {inventory.filter(item => item.status === 'out_of_stock').length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Products with no inventory
          </p>
        </div>
      </div>
      
      {/* No results */}
      {filteredInventory.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No inventory items found</h3>
          <p className="mt-1 text-gray-500">
            {inventory.length === 0 
              ? 'No products have been added to your inventory yet' 
              : 'Try adjusting your search or filters to find what you are looking for'}
          </p>
          {inventory.length === 0 && (
            <Link 
              to="/dashboard/admin-products"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Product
            </Link>
          )}
        </div>
      )}
      
      {/* Inventory Table */}
      {filteredInventory.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.productSku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                      {item.reservedQuantity > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({item.reservedQuantity} reserved)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${item.status === 'in_stock' ? 'bg-green-100 text-green-800' : ''}
                        ${item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${item.status === 'out_of_stock' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.lastUpdated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleAdjustInventory(item)}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Adjust Inventory"
      >
        {selectedItem && (
          <InventoryAdjustmentForm
            item={selectedItem}
            onSave={handleSaveAdjustment}
            onCancel={() => setIsAdjustmentModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default InventoryManagementPage;