import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, Product } from '../services/productsApi';
import { Package, Search, ShoppingCart, AlertCircle, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import PurchaseRequestForm from '../components/products/PurchaseRequestForm';
import { Link } from 'react-router-dom';

const AdminProductsCatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Get user from localStorage as a fallback
  const getUserFromLocalStorage = () => {
    try {
      const userFromStorage = localStorage.getItem('user');
      if (userFromStorage) {
        return JSON.parse(userFromStorage);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    return null;
  };

  useEffect(() => {
    console.log('AdminProductsCatalogPage: User state', { user });
    
    // Immediate dummy data to prevent blank page while loading
    setProducts([{
      _id: 'loading-placeholder',
      name: 'Loading products...',
      description: 'Products will appear here shortly',
      price: 0,
      stock: 0,
      category: 'Loading',
      sku: 'LOADING',
      loyaltyPoints: 0
    }]);
    
    // Add a delay to ensure auth context is fully loaded
    const timer = setTimeout(() => {
      fetchAdminProducts();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user]);

  const fetchAdminProducts = async () => {
    // Use either the authenticated user or the localStorage user
    const currentUser = user || getUserFromLocalStorage();
    
    if (!currentUser) {
      console.log('No user found, skipping product fetch');
      setError('User information not available. Please log in again.');
      setLoading(false);
      return;
    }
    
    console.log('Using user for product fetch:', currentUser.email, currentUser.role);
    
    setLoading(true);
    try {
      console.log('Fetching admin products for client:', currentUser.id);
      console.log('Client organization:', currentUser?.organization);
      
      // Prepare request filters with admin-specific parameters
      const requestFilters: {
        _t: number;
        status: string;
        adminView: boolean;
        organizationId?: string;
      } = {
        _t: Date.now(), // Prevent caching
        status: 'active', // Only get active products
        adminView: currentUser.role === 'admin' // Explicitly signal admin view
      };
      
      // If user has organization ID, include it
      if (currentUser.organizationId || (currentUser.organization && currentUser.organization.id)) {
        requestFilters.organizationId = currentUser.organizationId || currentUser.organization.id;
      }
      
      console.log('Fetching products with filters:', requestFilters);
      
      try {
        // First attempt
        const response = await getProducts(requestFilters);
        
        console.log('Products response:', response);
        
        processProductsResponse(response);
      } catch (initialError) {
        console.error('Initial products request failed:', initialError);
        
        // Try alternate approach for admin users
        if (currentUser.role === 'admin') {
          console.log('Attempting alternative fetch for admin...');
          try {
            // Try without filters except timestamp
            const fallbackResponse = await getProducts({
              _t: Date.now(),
              adminView: true
            });
            
            console.log('Admin fallback response:', fallbackResponse);
            processProductsResponse(fallbackResponse);
          } catch (fallbackError) {
            // If fallback also fails, rethrow the original error
            throw initialError;
          }
        } else {
          // For non-admin users, just rethrow
          throw initialError;
        }
      }
    } catch (err: any) {
      handleProductsError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to process products API response
  const processProductsResponse = (response: any) => {
    if (response.products && response.products.length > 0) {
      // Show all products for now - minimize filtering
      const filteredProducts = response.products.filter((product: Product) => {
        return product.status !== 'inactive';
      });
      
      console.log(`Found ${filteredProducts.length} products for client after filtering`);
      
      if (filteredProducts.length === 0) {
        console.warn('No products found after filtering. Using unfiltered products.');
        setProducts(response.products);
      } else {
        setProducts(filteredProducts);
      }
      
      // Extract unique categories for filtering
      const uniqueCategories = ['all', ...Array.from(new Set(
        response.products.map((product: Product) => product.category)
      ).values())].filter(category => typeof category === 'string');
      setCategories(uniqueCategories as string[]); // Filter out empty categories
    } else {
      console.error('No products found in response', response);
      setError('No products found. The catalog may be empty.');
    }
  };
  
  // Helper function to handle errors
  const handleProductsError = (err: any) => {
    console.error('Error fetching admin products:', err);
    
    // Enhanced error information
    let errorMessage = 'Failed to load products. Please try again later.';
    
    if (err.response) {
      console.error('Error response:', err.response);
      errorMessage = `API Error (${err.response.status}): ${err.response.data?.message || 'Server error'}`;
      
      if (err.response.status === 401) {
        errorMessage = 'Authentication error. Please log out and log back in.';
        // Log auth information for debugging
        console.error('Auth state during 401 error:', {
          token: localStorage.getItem('token') ? 'Present' : 'Missing',
          user: user ? JSON.stringify(user) : 'null'
        });
      } else if (err.response.status === 404) {
        errorMessage = 'Product catalog API endpoint not found. Please contact support.';
      } else if (err.response.status === 500) {
        errorMessage = 'Server error. The team has been notified.';
      }
    } else if (err.request) {
      // Request was made but no response received
      console.error('No response received from server:', err.request);
      errorMessage = 'No response from server. Please check your internet connection.';
    } else {
      // Client-side error
      console.error('Client error:', err.message);
      errorMessage = `Error: ${err.message}`;
    }
    
    // Show a clearer error message to the user
    setError(errorMessage);
    
    // In case of API error, add fallback products to prevent blank screen
    setProducts([{
      _id: 'error-placeholder',
      name: 'Error loading products',
      description: 'Please try refreshing the page',
      price: 0,
      stock: 0,
      category: 'Error',
      sku: 'ERROR',
      loyaltyPoints: 0
    }]);
    
    // Show toast notification
    toast.error(errorMessage);
  };

  const handlePurchaseRequest = (product: Product) => {
    setSelectedProduct(product);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSubmitted = () => {
    setIsPurchaseModalOpen(false);
    setSelectedProduct(null);
    fetchAdminProducts(); // Refresh the list after submission
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Direct fetch fallback - only for admin users when all else fails
  const directFetchProducts = async () => {
    const currentUser = user || getUserFromLocalStorage();
    
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Direct fetch only available for admin users');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting direct fetch for admin products...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Direct fetch to API endpoint - use simple URL without query params that might cause CORS issues
      const response = await fetch('/api/products?_t=' + Date.now(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Direct fetch successful:', data);
      
      // Use the same processor as regular requests
      processProductsResponse(data);
    } catch (err: any) {
      console.error('Direct fetch failed:', err);
      setError(`Direct fetch failed: ${err.message}`);
      toast.error('Failed to fetch products directly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Only logged-in users should access this page
  if (!user && !getUserFromLocalStorage()) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Loading...</h2>
        <p className="mt-2">User data is loading. Please wait.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Product Catalog</h1>
          <p className="text-gray-600 mt-1">
            Browse products from your administrative organization and submit purchase requests
          </p>
        </div>
        
        {/* Only show request link for client users */}
        {(user?.role === 'client' || getUserFromLocalStorage()?.role === 'client') && (
          <div>
            <Link 
              to="/dashboard/client-purchase-requests" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              View My Purchase Requests
            </Link>
          </div>
        )}
      </div>
      
      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <div className="mt-3 flex space-x-3">
            <button 
              onClick={fetchAdminProducts}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
            
            {/* Direct fetch button for admin users */}
            {(user?.role === 'admin' || getUserFromLocalStorage()?.role === 'admin') && (
              <button 
                onClick={directFetchProducts}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Direct Fetch (Admin)
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-gray-500">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No admin products are available for purchase at this time'}
          </p>
        </div>
      )}
      
      {/* Products Grid */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
              {/* Product Image */}
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-gray-400" />
                )}
              </div>
              
              {/* Product Details */}
              <div className="px-4 py-4 flex-1 flex flex-col">
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                  {product.category || 'Uncategorized'}
                </span>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
                
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                )}
                
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {product.loyaltyPoints > 0 && `${product.loyaltyPoints} points`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                    
                    <button
                      onClick={() => handlePurchaseRequest(product)}
                      disabled={product.stock <= 0}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white 
                        ${product.stock > 0 
                        ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                        : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                      <ShoppingCart className="mr-1 h-4 w-4" />
                      Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Purchase Request Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          title="Request Purchase"
        >
          <PurchaseRequestForm
            product={selectedProduct}
            onRequestSubmitted={handlePurchaseSubmitted}
            onCancel={() => setIsPurchaseModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default AdminProductsCatalogPage; 