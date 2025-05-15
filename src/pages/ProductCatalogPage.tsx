import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, ChevronDown, Edit, Trash2, Eye, AlertCircle, Award, ShoppingBag } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import ProductModal from '../components/products/ProductModal';
import PurchaseRequestModal from '../components/products/PurchaseRequestModal';
import { getProducts } from '../services/productsApi';

// Define product type
type Product = {
  _id: string;
  name: string;
  sku: string;
  description: string;
  categories: string[];
  pricing: {
    manufacturerPrice: number;
    suggestedClientPrice: number;
    suggestedRetailPrice: number;
  };
  inventory: {
    currentStock: number;
    reorderLevel: number;
    reservedStock: number;
  };
  loyaltyPoints: {
    clientPoints: number; // Points earned by clients when purchasing from manufacturer
    dealerPoints: number; // Points earned by dealers when purchasing from clients
  };
  images: string[];
  status: 'active' | 'discontinued' | 'out_of_stock' | 'coming_soon' | 'low_stock';
};

// Define the purchase product type used by the PurchaseRequestModal
type PurchaseProduct = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  stock?: number;
};

// Empty products data - removed mock products
const mockProducts: Product[] = [];

const ProductCatalogPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  
  // New state for purchase request modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<PurchaseProduct | null>(null);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would be an API call
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // setProducts(data);
        
        // Using mock data for now
        setProducts(mockProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Filter products based on search and filters
  useEffect(() => {
    let result = [...products];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(term) || 
        product.sku.toLowerCase().includes(term) || 
        product.description.toLowerCase().includes(term)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(product => 
        product.categories.includes(categoryFilter)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(product => 
        product.status === statusFilter
      );
    }
    
    setFilteredProducts(result);
  }, [products, searchTerm, categoryFilter, statusFilter]);

  // Get unique categories for filter
  const categories = Array.from(
    new Set(products.flatMap(product => product.categories))
  );

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle view product details
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle create new product
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle delete product
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // In a real implementation, this would be an API call
      // await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      
      // Update local state
      setProducts(prevProducts => 
        prevProducts.filter(product => product._id !== productId)
      );
    }
  };

  // New function to handle purchase request
  const handleRequestPurchase = (product: Product) => {
    // Convert the product model to the format expected by PurchaseRequestModal
    const purchaseProduct: PurchaseProduct = {
      _id: product._id,
      name: product.name,
      price: product.pricing.suggestedClientPrice,
      description: product.description,
      stock: product.inventory.currentStock
    };
    
    setSelectedProductForPurchase(purchaseProduct);
    setIsPurchaseModalOpen(true);
  };

  // Render product status badge
  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    let textColor = '';
    
    switch (status) {
      case 'active':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'discontinued':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'out_of_stock':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'coming_soon':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'low_stock':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Check if user has permission to manage products
  const canManageProducts = user?.role === 'admin';
  
  // Check if user can request purchases
  const canRequestPurchases = user?.role === 'client';

  return (
    <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-gray-600">
              {user?.role === 'admin' 
                ? 'Manage your product catalog and inventory' 
                : 'Browse available products and inventory'}
            </p>
          </div>
          
          {canManageProducts && (
            <button
              onClick={handleCreateProduct}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus size={16} className="mr-2" />
              Add New Product
            </button>
          )}
        </div>
        
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name, SKU, or description"
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48">
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Package size={48} className="mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start by adding a new product'}
            </p>
            {canManageProducts && (
              <button
                onClick={handleCreateProduct}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus size={16} className="mr-2" />
                Add New Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                    {renderStatusBadge(product.status)}
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Manufacturer Price</p>
                      <p className="text-sm font-medium">{formatCurrency(product.pricing.manufacturerPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Retail Price</p>
                      <p className="text-sm font-medium">{formatCurrency(product.pricing.suggestedRetailPrice)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-indigo-50 p-2 rounded-md">
                      <p className="text-xs text-indigo-700 font-medium flex items-center">
                        <Award size={12} className="mr-1 text-indigo-600" />
                        Client Points
                      </p>
                      <p className="text-sm font-bold text-indigo-800">{product.loyaltyPoints.clientPoints} pts</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <p className="text-xs text-purple-700 font-medium flex items-center">
                        <Award size={12} className="mr-1 text-purple-600" />
                        Dealer Points
                      </p>
                      <p className="text-sm font-bold text-purple-800">{product.loyaltyPoints.dealerPoints} pts</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500">Inventory</p>
                      <p className="text-xs font-medium">
                        {product.inventory.currentStock} / {product.inventory.reorderLevel} min
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${product.inventory.currentStock <= product.inventory.reorderLevel ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (product.inventory.currentStock / (product.inventory.reorderLevel * 2)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-1">
                    {product.categories.map(category => (
                      <span key={category} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between">
                  <button
                    onClick={() => handleViewProduct(product)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Eye size={16} className="mr-1" />
                    View
                  </button>
                  
                  {canManageProducts && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  )}
                  
                  {canRequestPurchases && (
                    <button
                      onClick={() => handleRequestPurchase(product)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <ShoppingBag size={16} className="mr-1" />
                      Request Purchase
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Product Modal */}
        {isModalOpen && (
          <ProductModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            product={selectedProduct}
            mode={modalMode}
            categories={categories}
            onSave={(updatedProduct) => {
              if (modalMode === 'create') {
                // In a real implementation, this would be an API call
                const newProduct = {
                  ...updatedProduct,
                  _id: `${products.length + 1}`,
                };
                setProducts([...products, newProduct]);
              } else if (modalMode === 'edit' && selectedProduct) {
                // In a real implementation, this would be an API call
                const updatedProducts = products.map(product => 
                  product._id === selectedProduct._id ? updatedProduct : product
                );
                setProducts(updatedProducts);
              }
            }}
          />
        )}
        
        {/* Purchase Request Modal */}
        {isPurchaseModalOpen && selectedProductForPurchase && (
          <PurchaseRequestModal
            isOpen={isPurchaseModalOpen}
            onClose={() => setIsPurchaseModalOpen(false)}
            product={selectedProductForPurchase}
          />
        )}
      </div>
  );
};

export default ProductCatalogPage;