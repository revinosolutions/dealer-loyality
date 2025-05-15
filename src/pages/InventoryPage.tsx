import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, RefreshCw, AlertCircle, Edit, Plus, Minus, Save, X, Truck, BarChart, ShoppingCart, UploadCloud } from 'lucide-react';
import { getProducts, Product, updateProductInventory, updateClientProductInventory, createClientProduct } from '../services/productsApi';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface InventoryEditState {
  productId: string;
  currentStock: number;
  reorderLevel?: number;
  reservedStock?: number;
  isClientProduct?: boolean;
}

interface NewClientProductState {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  loyaltyPoints: number;
  initialInventory: number;
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [editingInventory, setEditingInventory] = useState<InventoryEditState | null>(null);
  const [savingInventory, setSavingInventory] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState<NewClientProductState>({
    name: '',
    description: '',
    sku: '',
    category: 'Client Products',
    price: 0,
    loyaltyPoints: 0,
    initialInventory: 0
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // Initial fetch of inventory data when component mounts
  useEffect(() => {
    console.log('InventoryPage mounted, loading inventory...');
    try {
      // Check user authentication
      if (!user) {
        console.log('No user found, waiting for auth...');
      } else {
        console.log('User found, fetching inventory for:', { 
          id: user.id, 
          role: user.role,
          organization: user.organization?.id 
        });
        fetchInventory();
      }
    } catch (err) {
      console.error('Error during initial inventory fetch:', err);
    }
  }, []);

  // Also refresh when user changes (to ensure client-specific data)
  useEffect(() => {
    console.log('User context changed, refreshing inventory with user:', user?.id, user?.role);
    if (user && user.id) {
      console.log('User authenticated, requesting inventory fetch...');
      fetchInventory();
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

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let response;
      
      // Different fetching logic based on user role
      if (user?.role === 'client') {
        // For clients: Query both regular and client-uploaded products
        console.log('DEBUG: Client ID used for filtering inventory:', user.id);
        console.log('Client organization ID:', user?.organization?.id);
        
        // We'll make three requests to ensure we get all products:
        // 1. First, get products where createdBy matches client ID (client-owned products)
        const createdByResponse = await getProducts({ 
          createdBy: user.id,
          _t: Date.now() // Add timestamp to prevent caching
        });
        
        console.log('Client created products fetched:', createdByResponse);
        
        // 2. Get products where isClientUploaded is true for this client
        const clientProductsResponse = await getProducts({
          isClientUploaded: true,
          createdBy: user.id,
          _t: Date.now() + 1 // Different timestamp to prevent caching
        });
        
        console.log('Client uploaded products fetched:', clientProductsResponse);
        
        // 3. Get products that have clientInventory where the product was for this client
        // This is needed to get products transferred from admin via purchase requests
        const transferredProductsResponse = await getProducts({
          hasClientInventory: true,
          clientId: user.id,
          _t: Date.now() + 2 // Different timestamp to prevent caching
        });
        
        console.log('Products transferred via purchase requests:', transferredProductsResponse);
        
        // 4. Get admin-created products that are active and in client's organization
        // But EXCLUDE products that the client already has through purchase requests
        const adminProductsResponse = await getProducts({
          status: 'active',
          organizationId: user?.organization?.id,
          isClientUploaded: false, // Only get admin-created products
          _t: Date.now() + 3 // Different timestamp to prevent caching
        });
        
        console.log('Admin products available for client fetched:', adminProductsResponse);
        
        // First, collect all client-specific products (created by client or transferred via purchase requests)
        const clientSpecificProducts = [
          ...(createdByResponse.products || []),
          ...(clientProductsResponse.products || []),
          ...(transferredProductsResponse.products || [])
        ];
        
        // Create a map of product names from client-specific products
        // This will be used to filter out admin products that client already has via purchase requests
        const clientProductNamesMap = new Map();
        clientSpecificProducts.forEach(product => {
          if (product.name) {
            clientProductNamesMap.set(product.name, true);
          }
        });
        
        console.log(`Client has ${clientProductNamesMap.size} unique product names`);
        
        // Filter admin products to exclude ones the client already has
        const filteredAdminProducts = (adminProductsResponse.products || []).filter(product => {
          // Keep only admin products that the client doesn't already have a version of
          return !clientProductNamesMap.has(product.name);
        });
        
        console.log(`Filtered admin products from ${adminProductsResponse.products?.length || 0} to ${filteredAdminProducts.length}`);
        
        // Combine and deduplicate products
        const allProducts = [
          ...clientSpecificProducts,
          ...filteredAdminProducts
        ];
        
        // Deduplicate by _id
        const uniqueProductMap = new Map();
        allProducts.forEach(product => {
          if (product._id) {
            uniqueProductMap.set(product._id, product);
          }
        });
        
        const uniqueProducts = Array.from(uniqueProductMap.values());
        console.log(`Combined ${uniqueProducts.length} unique products for client view`);
        
        if (uniqueProducts.length === 0) {
          console.log('No inventory items found for client');
          setInventory([]);
        } else {
          // Categorize the products by type for logging
          const clientUploaded = uniqueProducts.filter(p => p.isClientUploaded).length;
          const clientInventory = uniqueProducts.filter(p => p.clientInventory && p.clientInventory.currentStock > 0).length;
          const adminCreated = uniqueProducts.filter(p => !p.isClientUploaded && (!p.clientInventory || p.clientInventory.currentStock === 0)).length;
          
          console.log(`Inventory breakdown: ${clientUploaded} client-uploaded, ${clientInventory} with client inventory, ${adminCreated} admin-created`);
          
          // Log products for debugging
          console.log('DEBUG: Products before setting state:', uniqueProducts.map(p => ({
            id: p._id,
            name: p.name,
            isClientUploaded: p.isClientUploaded,
            hasClientInventory: !!p.clientInventory,
            clientStock: p.clientInventory?.currentStock || 0,
            createdBy: p.createdBy,
            stock: p.isClientUploaded || p.clientInventory ? (p.clientInventory?.currentStock || 0) : p.stock
          })));
          
          // Set all products to inventory state
          setInventory(uniqueProducts);
          console.log(`Set inventory with ${uniqueProducts.length} total products for client view`);
        }
      } else if (user?.role === 'admin') {
        // For admins: only fetch products that are:
        // 1. Created by this admin (prevents seeing client inventory products)
        // 2. Have a status (any status is fine for admin view)
        response = await getProducts({
          createdBy: user.id,
          _t: Date.now() // Add timestamp to prevent caching
        });
        
        console.log('Admin inventory fetched:', response);
        
        if (!response.products || response.products.length === 0) {
          console.log('No inventory items found for admin');
          setInventory([]);
        } else {
          // Additional filtering to ensure only admin-created products are shown
          const adminInventoryItems = response.products.filter(product => {
            // Product must be created by this admin
            const isCreatedByAdmin = 
              product.createdBy === user.id || 
              (product.createdBy && typeof product.createdBy === 'object' && 
               'id' in (product.createdBy as object) && (product.createdBy as any).id === user.id) ||
              (product.createdBy && typeof product.createdBy === 'object' && 
               '_id' in (product.createdBy as object) && (product.createdBy as any)._id === user.id);
              
            return isCreatedByAdmin;
          });
          
          console.log(`Filtered admin inventory from ${response.products.length} to ${adminInventoryItems.length} valid items`);
          
          setInventory(adminInventoryItems);
        }
      } else {
        // For other roles: no products should be shown
        setInventory([]);
        setError("Your role doesn't have access to inventory management");
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory. Please try again later.');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const startEditingInventory = (product: Product) => {
    console.log('Starting to edit product:', product);
    
    // Don't allow editing of admin-created products for clients that don't have clientInventory
    if (user?.role === 'client' && !product.isClientUploaded && !product.clientInventory) {
      console.log('Cannot edit admin-created product as client');
      toast.error('Admin-created products cannot be edited');
      return;
    }
    
    // Determine if this is a client product (either uploaded by client or purchased from admin)
    const isClientProduct = product.isClientUploaded === true || 
                           (product.clientInventory !== undefined && product.clientInventory !== null);
    
    // Get the current stock based on whether it's a client product or not
    const currentStock = isClientProduct && product.clientInventory 
        ? product.clientInventory.currentStock 
        : product.stock;
    
    // Get the reorder level
    const reorderLevel = isClientProduct && product.clientInventory 
        ? product.clientInventory.reorderLevel 
        : (product.reorderLevel || 5);
    
    console.log('Product editing values:', {
      productId: product._id,
      isClientProduct,
      currentStock,
      reorderLevel,
      clientInventory: product.clientInventory
    });
    
    setEditingInventory({
      productId: product._id || '',
      currentStock: currentStock || 0,
      reorderLevel: reorderLevel || 5,
      reservedStock: product.reservedStock || 0,
      isClientProduct: isClientProduct
    });
  };

  const cancelEditing = () => {
    setEditingInventory(null);
  };

  const updateStock = async () => {
    if (!editingInventory) return;

    setSavingInventory(true);
    try {
      console.log(`Updating stock for product ${editingInventory.productId}, isClientProduct: ${editingInventory.isClientProduct}`);
      
      // Different update logic for client products vs regular products
      if (editingInventory.isClientProduct) {
        console.log('Updating client product inventory with:', {
          currentStock: editingInventory.currentStock,
          reorderLevel: editingInventory.reorderLevel
        });
        
        // Update client product inventory
        const result = await updateClientProductInventory(editingInventory.productId, {
          currentStock: editingInventory.currentStock,
          reorderLevel: editingInventory.reorderLevel
        });
        
        console.log('Update result:', result);

        // Update local state - fix type issue
        setInventory(prev => prev.map(product => {
          if (product._id === editingInventory.productId) {
            console.log('Updating product in state:', product.name);
            // Update clientInventory or create it if it doesn't exist
            const updatedProduct = {
              ...product,
              clientInventory: {
                initialStock: product.clientInventory?.initialStock || editingInventory.currentStock,
                currentStock: editingInventory.currentStock,
                reorderLevel: editingInventory.reorderLevel || 5,
                lastUpdated: new Date().toISOString()
              }
            };
            
            // Ensure the isClientUploaded flag is set for products with clientInventory
            if (!updatedProduct.isClientUploaded && updatedProduct.clientInventory) {
              updatedProduct.isClientUploaded = true;
            }
            
            return updatedProduct as Product; // Cast to Product to fix type error
          }
          return product;
        }));
        
        toast.success('Client inventory updated successfully');
      } else {
        // Update regular product inventory
        console.log('Updating regular product inventory');
      await updateProductInventory(editingInventory.productId, {
        currentStock: editingInventory.currentStock,
        reorderLevel: editingInventory.reorderLevel,
        reservedStock: editingInventory.reservedStock
      });

      // Update local state
      setInventory(prev => prev.map(product => {
        if (product._id === editingInventory.productId) {
          return {
            ...product,
            stock: editingInventory.currentStock,
            reorderLevel: editingInventory.reorderLevel,
            reservedStock: editingInventory.reservedStock
          };
        }
        return product;
      }));

      toast.success('Inventory updated successfully');
      }

      // Close the editing modal
      setEditingInventory(null);
      
      // Refresh the inventory data after a short delay to ensure server changes are reflected
      setTimeout(() => {
        fetchInventory();
      }, 500);
    } catch (error) {
      console.error('Failed to update inventory:', error);
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

  const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct({
      ...newProduct,
      [name]: name === 'price' || name === 'loyaltyPoints' || name === 'initialInventory' 
        ? parseFloat(value) || 0 
        : value
    });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingProduct(true);
    
    try {
      // Validate form data
      if (!newProduct.name || !newProduct.sku || newProduct.price <= 0 || newProduct.initialInventory <= 0) {
        toast.error('Please fill in all required fields with valid values');
        setAddingProduct(false);
        return;
      }
      
      console.log('Creating new client product with initial inventory:', newProduct);
      
      // Set organization ID from user if available
      const organizationId = user?.organization?.id;
      console.log('Using organization ID:', organizationId);
      
      // Create new client product with inventory
      const productToCreate = {
        ...newProduct,
        status: 'active',
        minOrderQuantity: 1,
        stock: 0, // For client products, main stock is 0
        isClientUploaded: true, // Explicitly mark as client-uploaded
        initialInventory: newProduct.initialInventory, // Make sure initial inventory is passed
        organizationId: organizationId, // Add organization ID if available
        createdBy: user?.id, // Explicitly include creator ID
        images: []
      };
      
      console.log('Final product data before API call:', productToCreate);
      
      const createdProduct = await createClientProduct(productToCreate);
      
      console.log('Product successfully created:', createdProduct);
      
      // Show success message with stock info
      toast.success(`Product added with initial inventory of ${newProduct.initialInventory} units`);
      
      // Reset form
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        category: 'Client Products',
        price: 0,
        loyaltyPoints: 0,
        initialInventory: 0
      });
      
      // Hide form
      setShowAddProductForm(false);
      
      // Force a full refresh of inventory to make sure we get the new product
      console.log('Forcing inventory refresh after product creation');
      
      // Add a small delay to allow server to process the new product
      setTimeout(() => {
        fetchInventory();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to add product:', error);
      // Provide more specific error message if available
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add product. Please try again.';
      toast.error(errorMessage);
    } finally {
      setAddingProduct(false);
    }
  };

  const getStockValue = (product: Product): number => {
    // If it has clientInventory (created through purchase request or client upload), show that
    if (product.clientInventory) {
      console.log(`Getting stock for product with clientInventory ${product._id}: ${product.clientInventory.currentStock}`);
      return product.clientInventory.currentStock;
    }
    
    // If it's a client-uploaded product but missing clientInventory, show 0
    if (product.isClientUploaded && !product.clientInventory) {
      console.warn(`Client product ${product._id} is missing clientInventory`);
      return 0;
    }
    
    // For regular products, use the stock field
    return product.stock;
  };

  const getReorderLevelValue = (product: Product): number => {
    // If it has clientInventory, use that reorder level
    if (product.clientInventory) {
      return product.clientInventory.reorderLevel;
    }
    return product.reorderLevel || 5;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStockStatusClass = (product: Product) => {
    const stock = getStockValue(product);
    const reorderLevel = getReorderLevelValue(product);
    return stock <= 0 ? 'text-red-600' : stock <= reorderLevel ? 'text-orange-500' : 'text-green-600';
  };

  const getStockLabel = (product: Product) => {
    const stock = getStockValue(product);
    const reorderLevel = getReorderLevelValue(product);
    
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

  const renderClientView = () => {
    console.log('Rendering client inventory view with', inventory.length, 'products');
    
    // Log product details to help debugging
    if (inventory.length > 0) {
      console.log('Client inventory products:');
      inventory.forEach(product => {
        console.log(`- ${product.name} (${product._id}):`, {
          isClientUploaded: product.isClientUploaded,
          clientInventory: product.clientInventory,
          stock: getStockValue(product)
        });
      });
    } else {
      console.log('No inventory products found for client view');
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Inventory</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddProductForm(!showAddProductForm)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              {showAddProductForm ? 'Cancel' : 'Add New Product'}
              {!showAddProductForm && <UploadCloud size={18} className="ml-2" />}
              {showAddProductForm && <X size={18} className="ml-2" />}
            </button>
            <button
              onClick={fetchInventory}
              className="flex items-center bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        {showAddProductForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Product with Inventory</h2>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newProduct.name}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={newProduct.sku}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  name="category"
                  value={newProduct.category}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Price *</label>
                <input
                  type="number"
                  name="price"
                  value={newProduct.price}
                  onChange={handleNewProductChange}
                  min="0.01"
                  step="0.01"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Loyalty Points</label>
                <input
                  type="number"
                  name="loyaltyPoints"
                  value={newProduct.loyaltyPoints}
                  onChange={handleNewProductChange}
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Initial Inventory *</label>
                <input
                  type="number"
                  name="initialInventory"
                  value={newProduct.initialInventory}
                  onChange={handleNewProductChange}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={newProduct.description}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={addingProduct}
                >
                  {addingProduct ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-center mt-4 text-gray-500">Loading your inventory...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-red-500">{error}</div>
            <button 
              onClick={fetchInventory}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry Loading
            </button>
          </div>
        ) : inventory.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-center py-8">
              <div className="text-blue-500 mx-auto">
                <Package size={48} className="mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Inventory Items Found</h3>
              <p className="text-gray-500 mb-6">
                You haven't created any products yet. Add a new product to get started.
              </p>
              <button
                onClick={() => setShowAddProductForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <UploadCloud size={18} className="mr-2" />
                Create Your First Product
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow-md rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded">
                          {product.images && product.images.length > 0 ? (
                              <img className="h-10 w-10 rounded object-cover" src={product.images[0]} alt={product.name} />
                          ) : (
                              <Package size={20} className="text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.isClientUploaded ? 
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  My Product
                                </span> : 
                                product.clientInventory ?
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Purchased from Admin
                                </span> :
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Admin Product
                                </span>
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sku}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(product.price)}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getStockStatusClass(product)}>
                          {getStockValue(product)} units
                      </span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStockLabel(product)}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Show different actions based on product type */}
                        {(product.isClientUploaded || product.clientInventory || user?.role === 'admin') ? (
                          <button
                            onClick={() => startEditingInventory(product)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Edit size={18} />
                          </button>
                        ) : (
                          <span className="text-gray-400 cursor-not-allowed mr-4 tooltip" title="Admin products cannot be edited">
                            <Edit size={18} />
                          </span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Inventory Editing Modal */}
        {editingInventory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Update Inventory</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                <div className="flex items-center">
                  <button
                    onClick={() => changeStockValue(-1)}
                    className="bg-gray-200 text-gray-700 p-2 rounded-l"
                    disabled={editingInventory.currentStock <= 0}
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    value={editingInventory.currentStock}
                    onChange={(e) => setEditingInventory({
                      ...editingInventory,
                      currentStock: Math.max(0, parseInt(e.target.value) || 0)
                    })}
                    className="text-center p-2 w-20 border-t border-b"
                    min="0"
                  />
                  <button
                    onClick={() => changeStockValue(1)}
                    className="bg-gray-200 text-gray-700 p-2 rounded-r"
                  >
                    <Plus size={18} />
                  </button>
              </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={editingInventory.reorderLevel}
                  onChange={(e) => setEditingInventory({
                    ...editingInventory,
                    reorderLevel: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 border rounded"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  disabled={savingInventory}
                >
                  Cancel
                </button>
                <button
                  onClick={updateStock}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={savingInventory}
                >
                  {savingInventory ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderAdminView = () => (
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
                {editingInventory && editingInventory.productId === product._id ? (
                  <div className="flex space-x-2 justify-end">
                    <button 
                      onClick={updateStock}
                      disabled={savingInventory}
                      className="p-1 rounded text-green-600 hover:text-green-900"
                    >
                      <Save size={18} />
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="p-1 rounded text-gray-600 hover:text-gray-900"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => startEditingInventory(product)}
                    className="p-1 rounded text-blue-600 hover:text-blue-900"
                  >
                    <Edit size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!user || (user.role !== 'client' && user.role !== 'admin')) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle size={48} className="mx-auto text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-yellow-800">Access Restricted</h3>
        <p className="mt-1 text-yellow-600">This page is only available for client and admin users.</p>
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
          onClick={fetchInventory}
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
          onClick={fetchInventory}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh Inventory
        </button>
      </div>
      
      {user.role === 'client' ? renderClientView() : renderAdminView()}
    </div>
  );
};

export default InventoryPage; 