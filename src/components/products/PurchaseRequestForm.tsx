import React, { useState, useEffect } from 'react';
import { createPurchaseRequest, Product } from '../../services/productsApi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface PurchaseRequestFormProps {
  product: Product;
  onRequestSubmitted: () => void;
  onCancel: () => void;
}

const PurchaseRequestForm: React.FC<PurchaseRequestFormProps> = ({
  product,
  onRequestSubmitted,
  onCancel
}) => {
  const { user, isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(product.price);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate min and max limits
  const minQuantity = product.minOrderQuantity || 1;
  const maxQuantity = product.maxOrderQuantity || product.stock;

  // Debug information
  useEffect(() => {
    console.log("Auth state in PurchaseRequestForm:", { 
      isAuthenticated, 
      user: user ? { 
        id: user.id, 
        _id: (user as any)._id,
        role: user.role,
        email: user.email,
        organization: user.organization,
        token: localStorage.getItem('token') ? 'Present' : 'Missing'
      } : null 
    });
    
    // Check if token is present in localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found in localStorage');
    } else {
      console.log('Auth token found:', token.substring(0, 15) + '...');
    }
  }, [user, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check authentication
    if (!isAuthenticated || !user) {
      toast.error('You must be logged in to submit a purchase request');
      console.error('Authentication error:', { isAuthenticated, user });
      return;
    }
    
    // Enhanced user ID extraction - try multiple possible sources
    // MongoDB may return _id instead of id
    const userId = (user.id || (user as any)._id)?.toString();
    
    // Log all possible ID fields from user object for debugging
    console.log('User object ID check:', {
      'user.id': user.id,
      'user._id': (user as any)._id,
      'userId extracted': userId,
      'token present': !!localStorage.getItem('token')
    });
    
    if (!userId) {
      toast.error('Unable to identify user account');
      console.error('User ID missing:', user);
      return;
    }
    
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    if (quantity > product.stock) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }

    if (price <= 0) {
      toast.error('Price must be greater than zero');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create a complete request object with all necessary data
      const requestData = {
        productId: product._id as string,
        clientId: userId,
        quantity,
        price,
        notes
      };
      
      // Log the full request object
      console.log('Full purchase request data:', requestData);
      
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token missing. Please log in again.');
        console.error('No auth token found when submitting purchase request');
        setIsSubmitting(false);
        return;
      }
      
      try {
        const response = await createPurchaseRequest(requestData);
        console.log('Purchase request submitted successfully:', response);
        toast.success('Purchase request submitted successfully');
        onRequestSubmitted();
      } catch (error: any) {
        console.error('Error submitting purchase request:', error);
        
        // Get detailed error information
        const errorResponse = error.response?.data;
        console.error('Error details:', errorResponse);
        
        let errorMessage = 'Failed to submit purchase request. Please try again.';
        
        if (error.message === 'Network Error') {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorResponse?.message) {
          errorMessage = errorResponse.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Unexpected error in form submission:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product
        </label>
        <div className="bg-gray-100 p-3 rounded-md">
          <div className="flex items-center">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="h-12 w-12 rounded-md object-cover mr-3" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Suggested Price:</span>{' '}
              <span className="font-medium">${product.price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Available:</span>{' '}
              <span className="font-medium">{product.stock} units</span>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>{' '}
              <span className="font-medium">{product.category}</span>
            </div>
            <div>
              <span className="text-gray-500">Loyalty Points:</span>{' '}
              <span className="font-medium">{product.loyaltyPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            id="quantity"
            min={minQuantity}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            {product.minOrderQuantity && `Minimum order: ${product.minOrderQuantity} units`}
            {product.minOrderQuantity && product.maxOrderQuantity && ' • '}
            {product.maxOrderQuantity && `Maximum order: ${product.maxOrderQuantity} units`}
          </p>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Your Price
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="price"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">per unit</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Suggested price: ${product.price.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Add any specific instructions or notes for the admin"
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Total: ${(price * quantity).toFixed(2)}</span>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
      
      {/* Authentication debugging info (only visible during development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-2 bg-gray-100 rounded text-xs">
          <p>Auth Debug: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</p>
          <p>User: {user ? `${user.email} (${user.role})` : 'Not logged in'}</p>
          <p>User ID: {user?.id || (user as any)?._id || 'N/A'}</p>
          <p>Organization ID: {user?.organization?.id || 'N/A'}</p>
          <p>Token in localStorage: {localStorage.getItem('token') ? 'Yes' : 'No'}</p>
          <p>Full User Object: <pre className="whitespace-pre-wrap">{user ? JSON.stringify(user, null, 2) : 'null'}</pre></p>
        </div>
      )}
    </form>
  );
};

export default PurchaseRequestForm; 