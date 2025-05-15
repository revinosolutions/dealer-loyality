import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Grid, List, Tag, Package, Plus, Edit, Trash2, AlertCircle, ShoppingCart } from 'lucide-react';
import { getProducts, deleteProduct, Product } from '../services/productsApi';
import Modal from '../components/Modal';
import ProductForm from '../components/ProductForm';
import PurchaseRequestForm from '../components/products/PurchaseRequestForm';
import { toast } from 'react-hot-toast';

const ProductsPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts();
      setProducts(response.products);
      
      // Extract unique categories
      const uniqueCategories = ['all', ...new Set(response.products.map(product => product.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filter products based on search term and category
  const filteredProducts = products.filter(product => {
    // Apply search filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply category filter
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Handler for product form submission (both add and edit)
  const handleProductFormSubmit = async () => {
    await fetchProducts();
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!selectedProduct?._id) return;
    
    try {
      await deleteProduct(selectedProduct._id);
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
    }
  };

  // Open edit modal with selected product
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Handle purchase request
  const handlePurchaseClick = (product: Product) => {
    setSelectedProduct(product);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseRequestSubmitted = () => {
    setIsPurchaseModalOpen(false);
  };

  // Replace the existing Grid view rendering with this updated version:
  // Products in Grid view 
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                <Package size={64} className="text-gray-300" />
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                  {product.category}
                </span>
              </div>
              <p className="mt-1 text-gray-500 text-sm line-clamp-2">{product.description}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</span>
                <span className="text-sm text-gray-500">
                  Stock: {product.stock}
                </span>
              </div>
              <div className="mt-4 text-sm text-indigo-600">
                Loyalty Points: {product.loyaltyPoints}
              </div>
              
              {user && user.role === 'admin' && (
                <div className="mt-4 flex justify-between gap-2">
                  <button 
                    onClick={() => handleEditClick(product)}
                    className="flex-1 py-2 px-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(product)}
                    className="flex-1 py-2 px-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
              
              {user && user.role === 'client' && product.stock > 0 && (
                <div className="mt-4">
                  <button 
                    onClick={() => handlePurchaseClick(product)}
                    className="w-full py-2 px-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <ShoppingCart size={16} />
                    Request Purchase
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Replace the existing List view rendering with this updated version:
  // Products in List view 
  const renderListView = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
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
                Loyalty Points
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Package size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{product.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                  {product.loyaltyPoints}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user && user.role === 'admin' && (
                    <>
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  
                  {user && user.role === 'client' && product.stock > 0 && (
                    <button 
                      onClick={() => handlePurchaseClick(product)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Request Purchase
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        
        {/* Admin actions */}
        {user && user.role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Product
          </button>
        )}
        
        {/* Search and filters */}
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="border border-gray-300 rounded-md overflow-hidden flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading products...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-red-800">{error}</h3>
          <button 
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Package size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-gray-500">
            {products.length === 0 
              ? 'No products have been added yet' 
              : 'Try adjusting your search or filters'}
          </p>
          {user && user.role === 'admin' && products.length === 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Add Your First Product
            </button>
          )}
        </div>
      )}
      
      {/* Products Grid/List Views */}
      {!loading && !error && filteredProducts.length > 0 && (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}
      
      {/* Add Product Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
      >
        <ProductForm onSubmitSuccess={handleProductFormSubmit} />
      </Modal>
      
      {/* Edit Product Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
      >
        {selectedProduct && (
          <ProductForm 
            product={selectedProduct} 
            onSubmitSuccess={handleProductFormSubmit} 
          />
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Product"
      >
        <div className="p-6">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-center">Are you sure you want to delete this product?</h3>
          <p className="text-gray-500 text-center mt-2">This action cannot be undone.</p>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduct}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Purchase Request Modal */}
      <Modal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Request Product Purchase"
      >
        {selectedProduct && (
          <PurchaseRequestForm 
            product={selectedProduct} 
            onRequestSubmitted={handlePurchaseRequestSubmitted}
            onCancel={() => setIsPurchaseModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default ProductsPage; 