import React, { useState, useEffect } from 'react';
import { Product } from '../../services/productsApi';
import { createPurchaseRequest } from '../../services/purchaseRequestsApi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// Remove the local dummy implementation since we've added it to the API
// const createPurchaseRequest = async (requestData: any) => { ... };

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
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Calculate min and max limits
  const minQuantity = product.minOrderQuantity || 1;
  const maxQuantity = product.maxOrderQuantity || product.stock;

  // Reset form when product changes
  useEffect(() => {
    setQuantity(minQuantity);
    setPrice(product.price);
    setNotes('');
    setSubmitSuccess(false);
    setRequestId(null);
    setFormError(null);
  }, [product, minQuantity]);
  
  // Clear form error when form inputs change
  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
  }, [quantity, price, notes]);

  // Debug information
  useEffect(() => {
    console.log("Auth state in PurchaseRequestForm:", { 
      isAuthenticated, 
      user: user ? { 
        id: user.id, 
        _id: (user as any)._id,
        role: user.role,
        email: user.email,
        organization: user.organization
      } : null 
    });
  }, [user, isAuthenticated]);

  const getUserId = () => {
    if (!user) return null;
    // Return the first non-empty value from these options
    return user.id || (user as any)._id || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setFormError(null);
    
    // Check authentication
    if (!isAuthenticated || !user) {
      setFormError('You must be logged in to submit a purchase request');
      toast.error('You must be logged in to submit a purchase request');
      console.error('Authentication error:', { isAuthenticated, user });
      return;
    }
    
    // Get user ID
    const userId = getUserId();
    if (!userId) {
      setFormError('Unable to identify user account');
      toast.error('Unable to identify user account');
      console.error('User ID missing:', user);
      return;
    }
    
    // Input validation
    if (quantity <= 0) {
      setFormError('Quantity must be greater than zero');
      toast.error('Quantity must be greater than zero');
      return;
    }

    if (quantity > product.stock) {
      setFormError('Requested quantity exceeds available stock');
      toast.error('Requested quantity exceeds available stock');
      return;
    }

    if (price <= 0) {
      setFormError('Price must be greater than zero');
      toast.error('Price must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the request object
      const requestData = {
        productId: product._id as string,
        clientId: userId,
        quantity,
        price,
        notes: notes.trim() || undefined,
        // Add organization ID if available in user object
        organizationId: user.organization?.id
      };
      
      console.log('Submitting purchase request with data:', requestData);
      
      // Send the request
      const response = await createPurchaseRequest(requestData);
      
      console.log('Purchase request submitted successfully:', response);
      toast.success('Purchase request submitted successfully');
      
      // Store the request ID if available
      if (response && (response._id || response.id)) {
        setRequestId(response._id || response.id);
      }
      
      // Set success state
      setSubmitSuccess(true);
      
      // Call the parent component callback
      setTimeout(() => {
        onRequestSubmitted();
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting purchase request:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to submit purchase request. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
        console.error('Error message:', error.message);
      } else if (error.response) {
        console.error('Error response:', error.response);
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 404) {
          errorMessage = 'API endpoint not found. The service may be temporarily unavailable.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication error. Please log out and log back in.';
          // Store auth info for debugging
          console.error('Auth state during error:', { 
            token: localStorage.getItem('token') ? 'Present' : 'Missing',
            isAuthenticated, 
            user: user ? JSON.stringify(user) : 'null'
          });
        }
      } else if (error.name === 'NetworkError' || error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If form submitted successfully, show success message
  if (submitSuccess) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 className="mt-3 text-lg font-medium text-gray-900">Purchase Request Submitted!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your request for {quantity} units of {product.name} has been submitted successfully.
        </p>
        {requestId && (
          <p className="mt-1 text-xs text-gray-400">Request ID: {requestId}</p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          An admin will review your request shortly. You can check the status in your Purchase Requests section.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onRequestSubmitted}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View My Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form error message */}
      {formError && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{formError}</h3>
            </div>
          </div>
        </div>
      )}

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
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
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
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
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