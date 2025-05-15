import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Product, createProduct, updateProduct } from '../services/productsApi';
import { toast } from 'react-hot-toast';

interface ProductFormProps {
  product?: Product;
  onSubmitSuccess: () => void;
}

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  loyaltyPoints: number;
  stock: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  status: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmitSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: 0,
    loyaltyPoints: 0,
    stock: 0,
    minOrderQuantity: 1,
    status: 'active'
  });

  // Initialize form with product data if editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        category: product.category,
        price: product.price,
        loyaltyPoints: product.loyaltyPoints,
        stock: product.stock,
        minOrderQuantity: product.minOrderQuantity || 1,
        maxOrderQuantity: product.maxOrderQuantity === null ? undefined : Number(product.maxOrderQuantity),
        status: product.status || 'active'
      });
    }
  }, [product]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle numeric inputs
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : Number(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.sku || !formData.category || formData.price === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      if (product?._id) {
        // Update existing product
        await updateProduct(product._id, formData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await createProduct(formData as Omit<Product, '_id' | 'createdAt' | 'updatedAt'>);
        toast.success('Product created successfully');
      }
      
      onSubmitSuccess();
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name || ''}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Product Details */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="sku"
            id="sku"
            value={formData.sku || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="category"
            id="category"
            value={formData.category || ''}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="price"
              id="price"
              min="0"
              step="0.01"
              value={formData.price === undefined ? '' : formData.price}
              onChange={handleChange}
              required
              className="block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="loyaltyPoints" className="block text-sm font-medium text-gray-700">
            Loyalty Points <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="loyaltyPoints"
            id="loyaltyPoints"
            min="0"
            value={formData.loyaltyPoints === undefined ? '' : formData.loyaltyPoints}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {/* Inventory */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-4">Inventory</h3>
        </div>
        
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="stock"
            id="stock"
            min="0"
            value={formData.stock === undefined ? '' : formData.stock}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="minOrderQuantity" className="block text-sm font-medium text-gray-700">
            Minimum Order Quantity
          </label>
          <input
            type="number"
            name="minOrderQuantity"
            id="minOrderQuantity"
            min="1"
            value={formData.minOrderQuantity === undefined ? '' : formData.minOrderQuantity}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="maxOrderQuantity" className="block text-sm font-medium text-gray-700">
            Maximum Order Quantity
          </label>
          <input
            type="number"
            name="maxOrderQuantity"
            id="maxOrderQuantity"
            min="1"
            value={formData.maxOrderQuantity === undefined ? '' : formData.maxOrderQuantity}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            name="status"
            id="status"
            value={formData.status || 'active'}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 flex items-center">
          <span className="text-red-500 mr-1">*</span> Required fields
        </div>
        <div className="flex-grow"></div>
        <button
          type="button"
          onClick={onSubmitSuccess}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm; 