import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Icons
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ClipboardDocumentListIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Import API service to use centralized API configuration
import { apiRequest } from '../services/api';
import { productsApi } from '../services/api'; // Import the productsApi service

// We'll use the centralized API service instead of a custom axios instance

interface Product {
  _id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  loyaltyPoints: number;
  status: 'active' | 'inactive' | 'discontinued';
  images: string[];
  specifications: { name: string; value: string }[];
  isClientUploaded: boolean;
  createdAt: string;
}

const AdminProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [inventorySummary, setInventorySummary] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  });

  // For specifications (dynamic form fields)
  const [specifications, setSpecifications] = useState<{ name: string; value: string }[]>([]);

  // Fetch products
  useEffect(() => {
    // Check API connectivity first
    checkApiConnectivity();
    // Then fetch products
    fetchProducts();
  }, []);

  // Function to check API connectivity
  const checkApiConnectivity = async () => {
    try {
      console.log('Checking API connectivity...');
      const response = await fetch('/api/health-check', { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('API server is reachable ✅');
      } else {
        console.warn(`API health check failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('API connectivity check failed:', error);
      // Try a direct server check as fallback
      try {
        const baseCheck = await fetch('http://localhost:5000/api/products', {
          method: 'HEAD',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Direct API check result:', baseCheck.status);
      } catch (directError) {
        console.error('Direct API check also failed:', directError);
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    
    try {
      // Use productsApi for consistency and reliability
      // Add filter to exclude client products from admin view
      const response = await productsApi.getAllAdmin({
        isClientUploaded: false // Only show admin products, not client products
      });
      
      console.log('Products fetched:', response);
      
      // Handle different response formats
      let productsList: Product[] = [];
      
      if (Array.isArray(response)) {
        productsList = response as Product[];
      } else if (response.products && Array.isArray(response.products)) {
        productsList = response.products;
      } else if (response && typeof response === 'object') {
        // Try to extract products array from any response object structure
        const responseObj = response as Record<string, unknown>;
        for (const key in responseObj) {
          if (Array.isArray(responseObj[key])) {
            productsList = responseObj[key] as Product[];
            console.log(`Found products array in response.${key}`);
            break;
          }
        }
      }
      
      // Fallback if products are not in the expected structure
      if (!Array.isArray(productsList)) {
        console.warn('Unexpected products response structure:', response);
        productsList = [];
      }
      
      // Filter out any remaining client products that might have slipped through
      productsList = productsList.filter(product => !product.isClientUploaded);
      
      console.log(`Fetched ${productsList.length} admin products (excluding client products)`);
      
      setProducts(productsList);
      
      // Calculate inventory summary
      calculateInventorySummary(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Details:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.response?.headers
        });
      }
      
      toast.error('Failed to fetch products. Please check your connection or try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate inventory statistics
  const calculateInventorySummary = (productsList: Product[]) => {
    const summary = {
      totalProducts: productsList.length,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0
    };
    
    productsList.forEach(product => {
      const stock = product.stock || 0;
      const reorderLevel = 5; // Default reorder level
      
      if (stock === 0) {
        summary.outOfStock++;
      } else if (stock <= reorderLevel) {
        summary.lowStock++;
      } else {
        summary.inStock++;
      }
    });
    
    setInventorySummary(summary);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!currentProduct.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!currentProduct.sku?.trim()) {
      errors.sku = 'SKU is required';
    }
    
    if (!currentProduct.price || currentProduct.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    
    if (specifications.some(spec => !spec.name.trim() || !spec.value.trim())) {
      errors.specifications = 'All specification fields must be filled';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleAddProduct = async () => {
    if (!validateForm()) return;
    
    try {
      const productData = {
        ...currentProduct,
        specifications
        // Organization ID will be determined from the user's JWT token on the server
      };
      
      if (editMode && currentProduct._id) {
        // Use productsApi.update instead of direct apiRequest
        await productsApi.update(currentProduct._id, productData);
        toast.success('Product updated successfully');
      } else {
        // Use productsApi.create instead of direct apiRequest
        await productsApi.create(productData);
        toast.success('Product added successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Use productsApi.delete instead of direct apiRequest
        await productsApi.delete(id);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setSpecifications(product.specifications || []);
    setEditMode(true);
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setEditMode(false);
    setShowModal(true);
  };

  const resetForm = () => {
    setCurrentProduct({
      name: '',
      description: '',
      sku: '',
      category: '',
      price: 0,
      stock: 0,
      loyaltyPoints: 0,
      status: 'active',
      images: [],
    });
    setSpecifications([]);
    setFormErrors({});
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { name: '', value: '' }]);
  };

  const removeSpecification = (index: number) => {
    const newSpecs = [...specifications];
    newSpecs.splice(index, 1);
    setSpecifications(newSpecs);
  };

  const updateSpecification = (index: number, field: 'name' | 'value', value: string) => {
    const newSpecs = [...specifications];
    newSpecs[index][field] = value;
    setSpecifications(newSpecs);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
        <div className="flex space-x-3">
          <Link
            to="/dashboard/inventory-management"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
          >
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            Manage Inventory
          </Link>
          <button
            onClick={openAddModal}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Product
          </button>
        </div>
      </div>
      
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm">Total Products</h3>
            <button onClick={fetchProducts} className="text-gray-400 hover:text-gray-600">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-2xl font-bold mt-1">{inventorySummary.totalProducts}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 border-t border-r border-b border-gray-100">
          <h3 className="text-gray-500 text-sm">In Stock</h3>
          <p className="text-2xl font-bold mt-1 text-green-600">{inventorySummary.inStock}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500 border-t border-r border-b border-gray-100">
          <h3 className="text-gray-500 text-sm">Low Stock</h3>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{inventorySummary.lowStock}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 border-t border-r border-b border-gray-100">
          <h3 className="text-gray-500 text-sm">Out of Stock</h3>
          <p className="text-2xl font-bold mt-1 text-red-600">{inventorySummary.outOfStock}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={product.name} className="h-10 w-10 object-cover rounded-md" />
                          ) : (
                            <span className="text-gray-500 text-xs">No img</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${product.status === 'active' ? 'bg-green-100 text-green-800' : 
                          product.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <Link 
                          to={`/dashboard/inventory-management?product=${product._id}`} 
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <ClipboardDocumentListIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No products found. Click "Add New Product" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editMode ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                    <input
                      type="text"
                      id="name"
                      value={currentProduct.name || ''}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${formErrors.name ? 'border-red-300' : ''}`}
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="description"
                      rows={3}
                      value={currentProduct.description || ''}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      id="sku"
                      value={currentProduct.sku || ''}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${formErrors.sku ? 'border-red-300' : ''}`}
                    />
                    {formErrors.sku && <p className="mt-1 text-sm text-red-600">{formErrors.sku}</p>}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      id="category"
                      value={currentProduct.category || ''}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                      <input
                        type="number"
                        id="price"
                        min="0"
                        step="0.01"
                        value={currentProduct.price || ''}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${formErrors.price ? 'border-red-300' : ''}`}
                      />
                      {formErrors.price && <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>}
                    </div>
                    <div>
                      <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stock</label>
                      <input
                        type="number"
                        id="stock"
                        min="0"
                        value={currentProduct.stock || ''}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="loyaltyPoints" className="block text-sm font-medium text-gray-700">Loyalty Points</label>
                      <input
                        type="number"
                        id="loyaltyPoints"
                        min="0"
                        value={currentProduct.loyaltyPoints || ''}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, loyaltyPoints: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="status"
                        value={currentProduct.status || 'active'}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, status: e.target.value as 'active' | 'inactive' | 'discontinued' })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Specifications</label>
                      <button
                        type="button"
                        onClick={addSpecification}
                        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Spec
                      </button>
                    </div>
                    {specifications.map((spec, index) => (
                      <div key={index} className="flex space-x-2 mb-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={spec.name}
                          onChange={(e) => updateSpecification(index, 'name', e.target.value)}
                          className="flex-1 block border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={spec.value}
                          onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                          className="flex-1 block border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecification(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    {formErrors.specifications && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.specifications}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {editMode ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;