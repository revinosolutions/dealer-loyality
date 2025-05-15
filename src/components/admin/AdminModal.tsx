import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Building } from 'lucide-react';

// Import types from AuthContext
import { User, UserRole } from '../../contexts/AuthContext';

// Define company admin type with additional properties
export type CompanyAdmin = User & {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  inventoryAllocation?: number;
  status: 'active' | 'inactive' | 'pending';
};

type AdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  admin: CompanyAdmin | null;
  mode: 'view' | 'edit' | 'create';
  onSave: (admin: CompanyAdmin) => void;
};

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  admin,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<CompanyAdmin>>({
    name: '',
    email: '',
    password: '',
    role: 'client',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    inventoryAllocation: 0,
    status: 'pending'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when admin changes
  useEffect(() => {
    if (admin && (mode === 'edit' || mode === 'view')) {
      setFormData(admin);
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'client',
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        inventoryAllocation: 0,
        status: 'pending'
      });
    }
  }, [admin, mode]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: field.includes('Allocation') ? Number(value) : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Admin name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (mode === 'create' && !formData.password) newErrors.password = 'Password is required';
    if (!formData.companyName) newErrors.companyName = 'Company name is required';
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (optional field)
    if (formData.companyPhone && !/^[\d\(\)\-\+\s]+$/.test(formData.companyPhone)) {
      newErrors.companyPhone = 'Please enter a valid phone number';
    }
    
    // Inventory allocation validation
    if (formData.inventoryAllocation !== undefined && formData.inventoryAllocation < 0) {
      newErrors.inventoryAllocation = 'Inventory allocation cannot be negative';
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
      onSave(formData as CompanyAdmin);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                <Building className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {mode === 'create' ? 'Add New Company Admin' : 
                   mode === 'edit' ? 'Edit Company Admin' : 'Company Admin Details'}
                </h3>
                
                <div className="mt-4">
                  {mode === 'view' ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Company Information</h4>
                        <p className="text-sm text-gray-900">{formData.companyName}</p>
                        <p className="text-sm text-gray-600">{formData.companyAddress}</p>
                        <p className="text-sm text-gray-600">{formData.companyPhone}</p>
                        <p className="text-sm text-gray-600">{formData.companyEmail}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Admin Information</h4>
                        <p className="text-sm text-gray-900">{formData.name}</p>
                        <p className="text-sm text-gray-600">{formData.email}</p>
                        <p className="text-sm text-gray-600">{formData.phone}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Inventory Allocation</h4>
                        <p className="text-sm text-gray-900">
                          {formData.inventoryAllocation !== undefined
                            ? `${formData.inventoryAllocation} units`
                            : 'Not set'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <div className="mt-1">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            formData.status === 'active' ? 'bg-green-100 text-green-800' :
                            formData.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formData.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                        {/* Company Information */}
                        <div className="sm:col-span-2">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Company Information</h4>
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            name="companyName"
                            id="companyName"
                            value={formData.companyName || ''}
                            onChange={handleChange}
                            className={`mt-1 block w-full border ${errors.companyName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          />
                          {errors.companyName && (
                            <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                          )}
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
                            Company Address
                          </label>
                          <input
                            type="text"
                            name="companyAddress"
                            id="companyAddress"
                            value={formData.companyAddress || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                            Company Phone
                          </label>
                          <input
                            type="text"
                            name="companyPhone"
                            id="companyPhone"
                            value={formData.companyPhone || ''}
                            onChange={handleChange}
                            className={`mt-1 block w-full border ${errors.companyPhone ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          />
                          {errors.companyPhone && (
                            <p className="mt-1 text-sm text-red-600">{errors.companyPhone}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
                            Company Email
                          </label>
                          <input
                            type="email"
                            name="companyEmail"
                            id="companyEmail"
                            value={formData.companyEmail || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        
                        {/* Admin Information */}
                        <div className="sm:col-span-2 pt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Admin Information</h4>
                        </div>
                        
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Admin Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            className={`mt-1 block w-full border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className={`mt-1 block w-full border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                          )}
                        </div>
                        
                        {mode === 'create' && (
                          <div className="sm:col-span-2">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                              Password *
                            </label>
                            <input
                              type="password"
                              name="password"
                              id="password"
                              value={formData.password || ''}
                              onChange={handleChange}
                              className={`mt-1 block w-full border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.password && (
                              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                          </div>
                        )}
                        
                        {/* Inventory and Status */}
                        <div className="sm:col-span-2 pt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Inventory & Status</h4>
                        </div>
                        
                        <div>
                          <label htmlFor="inventoryAllocation" className="block text-sm font-medium text-gray-700">
                            Inventory Allocation
                          </label>
                          <input
                            type="number"
                            name="inventoryAllocation"
                            id="inventoryAllocation"
                            min="0"
                            value={formData.inventoryAllocation || 0}
                            onChange={handleChange}
                            className={`mt-1 block w-full border ${errors.inventoryAllocation ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          />
                          {errors.inventoryAllocation && (
                            <p className="mt-1 text-sm text-red-600">{errors.inventoryAllocation}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status || 'pending'}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {mode !== 'view' && (
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleSubmit}
              >
                {mode === 'create' ? 'Create Admin' : 'Save Changes'}
              </button>
            )}
            
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminModal;