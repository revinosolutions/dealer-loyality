import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Award } from 'lucide-react';

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
    clientPoints: number;
    dealerPoints: number;
  };
  images: string[];
  status: 'active' | 'discontinued' | 'out_of_stock' | 'coming_soon' | 'low_stock';
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  mode: 'view' | 'edit' | 'create';
  onSave: (product: Product) => void;
  categories: string[];
};

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  mode,
  onSave,
  categories
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    categories: [],
    pricing: {
      manufacturerPrice: 0,
      suggestedClientPrice: 0,
      suggestedRetailPrice: 0
    },
    inventory: {
      currentStock: 0,
      reorderLevel: 0,
      reservedStock: 0
    },
    loyaltyPoints: {
      clientPoints: 0,
      dealerPoints: 0
    },
    images: [],
    status: 'active'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoCalculate, setAutoCalculate] = useState<boolean>(true);

  // Initialize form data when product changes
  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      setFormData(product);
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        sku: '',
        description: '',
        categories: [],
        pricing: {
          manufacturerPrice: 0,
          suggestedClientPrice: 0,
          suggestedRetailPrice: 0
        },
        inventory: {
          currentStock: 0,
          reorderLevel: 0,
          reservedStock: 0
        },
        loyaltyPoints: {
          clientPoints: 0,
          dealerPoints: 0
        },
        images: [],
        status: 'active'
      });
    }
  }, [product, mode]);

  // Auto-calculate loyalty points based on pricing (1% of price)
  useEffect(() => {
    if (autoCalculate && formData.pricing) {
      setFormData(prev => ({
        ...prev,
        loyaltyPoints: {
          clientPoints: Math.round(prev.pricing?.manufacturerPrice || 0) / 100,
          dealerPoints: Math.round(prev.pricing?.suggestedClientPrice || 0) / 100
        }
      }));
    }
  }, [formData.pricing, autoCalculate]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: field.includes('Price') || field.includes('Stock') || field.includes('Level') || field.includes('Points')
            ? Number(value)
            : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle category selection
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedCategories = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedCategories.push(options[i].value);
      }
    }
    
    setFormData(prev => ({ ...prev, categories: selectedCategories }));
  };

  // Toggle auto-calculate loyalty points
  const handleAutoCalculateToggle = () => {
    setAutoCalculate(!autoCalculate);
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.sku) newErrors.sku = 'SKU is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.categories || formData.categories.length === 0) {
      newErrors.categories = 'At least one category is required';
    }
    
    if (!formData.pricing?.manufacturerPrice) {
      newErrors['pricing.manufacturerPrice'] = 'Manufacturer price is required';
    }
    
    if (!formData.pricing?.suggestedClientPrice) {
      newErrors['pricing.suggestedClientPrice'] = 'Client price is required';
    }
    
    if (!formData.pricing?.suggestedRetailPrice) {
      newErrors['pricing.suggestedRetailPrice'] = 'Retail price is required';
    }
    
    if (formData.loyaltyPoints?.clientPoints === undefined || formData.loyaltyPoints.clientPoints < 0) {
      newErrors['loyaltyPoints.clientPoints'] = 'Client points must be a positive number';
    }
    
    if (formData.loyaltyPoints?.dealerPoints === undefined || formData.loyaltyPoints.dealerPoints < 0) {
      newErrors['loyaltyPoints.dealerPoints'] = 'Dealer points must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'view') {
      onClose();
      return;
    }
    
    if (validateForm()) {
      onSave(formData as Product);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {mode === 'view' ? 'Product Details' : mode === 'edit' ? 'Edit Product' : 'Create New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                      SKU*
                    </label>
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku || ''}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 border ${errors.sku ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                    />
                    {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
                  </div>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description || ''}
                    onChange={handleChange}
                    disabled={mode === 'view'}
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>
                
                <div className="mt-4">
                  <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-1">
                    Categories*
                  </label>
                  <select
                    id="categories"
                    name="categories"
                    multiple
                    value={formData.categories || []}
                    onChange={handleCategoryChange}
                    disabled={mode === 'view'}
                    className={`w-full px-3 py-2 border ${errors.categories ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple categories</p>
                  {errors.categories && <p className="mt-1 text-sm text-red-600">{errors.categories}</p>}
                </div>
                
                <div className="mt-4">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status || 'active'}
                    onChange={handleChange}
                    disabled={mode === 'view'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                  >
                    <option value="active">Active</option>
                    <option value="discontinued">Discontinued</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="low_stock">Low Stock</option>
                  </select>
                </div>
              </div>
              
              {/* Pricing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="pricing.manufacturerPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer Price*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="pricing.manufacturerPrice"
                        name="pricing.manufacturerPrice"
                        min="0"
                        step="0.01"
                        value={formData.pricing?.manufacturerPrice || 0}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full pl-7 px-3 py-2 border ${errors['pricing.manufacturerPrice'] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                      />
                    </div>
                    {errors['pricing.manufacturerPrice'] && <p className="mt-1 text-sm text-red-600">{errors['pricing.manufacturerPrice']}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="pricing.suggestedClientPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Suggested Client Price*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="pricing.suggestedClientPrice"
                        name="pricing.suggestedClientPrice"
                        min="0"
                        step="0.01"
                        value={formData.pricing?.suggestedClientPrice || 0}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full pl-7 px-3 py-2 border ${errors['pricing.suggestedClientPrice'] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                      />
                    </div>
                    {errors['pricing.suggestedClientPrice'] && <p className="mt-1 text-sm text-red-600">{errors['pricing.suggestedClientPrice']}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="pricing.suggestedRetailPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Suggested Retail Price*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="pricing.suggestedRetailPrice"
                        name="pricing.suggestedRetailPrice"
                        min="0"
                        step="0.01"
                        value={formData.pricing?.suggestedRetailPrice || 0}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className={`w-full pl-7 px-3 py-2 border ${errors['pricing.suggestedRetailPrice'] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                      />
                    </div>
                    {errors['pricing.suggestedRetailPrice'] && <p className="mt-1 text-sm text-red-600">{errors['pricing.suggestedRetailPrice']}</p>}
                  </div>
                </div>
              </div>
              
              {/* Inventory */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="inventory.currentStock" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      id="inventory.currentStock"
                      name="inventory.currentStock"
                      min="0"
                      value={formData.inventory?.currentStock || 0}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="inventory.reorderLevel" className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      id="inventory.reorderLevel"
                      name="inventory.reorderLevel"
                      min="0"
                      value={formData.inventory?.reorderLevel || 0}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="inventory.reservedStock" className="block text-sm font-medium text-gray-700 mb-1">
                      Reserved Stock
                    </label>
                    <input
                      type="number"
                      id="inventory.reservedStock"
                      name="inventory.reservedStock"
                      min="0"
                      value={formData.inventory?.reservedStock || 0}
                      onChange={handleChange}
                      disabled={mode === 'view'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${mode === 'view' ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                </div>
              </div>
              
              {/* Loyalty Points */}
              <div className="md:col-span-2 bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-indigo-900 flex items-center">
                    <Award className="mr-2 h-5 w-5 text-indigo-600" />
                    Loyalty Points Configuration
                  </h3>
                  
                  {mode !== 'view' && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoCalculate"
                        checked={autoCalculate}
                        onChange={handleAutoCalculateToggle}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoCalculate" className="ml-2 block text-sm text-indigo-700">
                        Auto-calculate (1% of price)
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="loyaltyPoints.clientPoints" className="block text-sm font-medium text-indigo-700 mb-1">
                      Client Points*
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="loyaltyPoints.clientPoints"
                        name="loyaltyPoints.clientPoints"
                        min="0"
                        value={formData.loyaltyPoints?.clientPoints || 0}
                        onChange={handleChange}
                        disabled={mode === 'view' || autoCalculate}
                        className={`w-full px-3 py-2 border ${errors['loyaltyPoints.clientPoints'] ? 'border-red-500' : 'border-indigo-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${(mode === 'view' || autoCalculate) ? 'bg-indigo-100' : 'bg-white'}`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-indigo-500">pts</span>
                      </div>
                    </div>
                    {errors['loyaltyPoints.clientPoints'] && <p className="mt-1 text-sm text-red-600">{errors['loyaltyPoints.clientPoints']}</p>}
                    <p className="mt-1 text-xs text-indigo-600">
                      Points earned by clients when purchasing from manufacturer
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="loyaltyPoints.dealerPoints" className="block text-sm font-medium text-indigo-700 mb-1">
                      Dealer Points*
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="loyaltyPoints.dealerPoints"
                        name="loyaltyPoints.dealerPoints"
                        min="0"
                        value={formData.loyaltyPoints?.dealerPoints || 0}
                        onChange={handleChange}
                        disabled={mode === 'view' || autoCalculate}
                        className={`w-full px-3 py-2 border ${errors['loyaltyPoints.dealerPoints'] ? 'border-red-500' : 'border-indigo-300'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${(mode === 'view' || autoCalculate) ? 'bg-indigo-100' : 'bg-white'}`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-indigo-500">pts</span>
                      </div>
                    </div>
                    {errors['loyaltyPoints.dealerPoints'] && <p className="mt-1 text-sm text-red-600">{errors['loyaltyPoints.dealerPoints']}</p>}
                    <p className="mt-1 text-xs text-indigo-600">
                      Points earned by dealers when purchasing from clients
                    </p>
                  </div>
                </div>
                
                {mode !== 'view' && (
                  <div className="mt-3 p-3 bg-indigo-100 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm text-indigo-700">
                        Loyalty points are awarded to clients and dealers when they purchase products. 
                        These points can be redeemed for rewards in the Rewards Catalog. 
                        By default, points are calculated as 1% of the respective price tier.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          
          {mode !== 'view' && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Product
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;