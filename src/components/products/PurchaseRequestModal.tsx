import React, { useState } from 'react';
import { XCircle, AlertCircle, DollarSign, Package, ShoppingBag } from 'lucide-react';
import { createPurchaseRequest } from '../../services/productsApi';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface PurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    _id: string;
    name: string;
    price: number;
    description?: string;
    stock?: number;
  };
}

const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({ isOpen, onClose, product }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Calculate the total price
      const totalPrice = product.price * quantity;

      const purchaseData = {
        productId: product._id,
        clientId: user.id,
        quantity,
        price: product.price,
        notes
      };

      console.log('Submitting purchase request:', purchaseData);
      
      const response = await createPurchaseRequest(purchaseData);
      
      console.log('Purchase request response:', response);
      
      toast.success(
        <div>
          <p className="font-bold">Purchase request submitted!</p>
          <p className="text-sm">Your request is being reviewed by admins.</p>
        </div>,
        { duration: 5000 }
      );
      
      // Close the modal
      onClose();
      
      // Navigate to the client purchase requests page after a short delay
      setTimeout(() => {
        navigate('/dashboard/client-purchase-requests');
      }, 1500);
    } catch (err) {
      console.error('Error submitting purchase request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit purchase request');
      toast.error('Failed to submit purchase request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-indigo-800 flex items-center">
              <ShoppingBag size={18} className="mr-2" /> 
              Request Purchase
            </h3>
            <button 
              onClick={onClose}
              className="text-indigo-500 hover:text-indigo-700"
              disabled={submitting}
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
                <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="p-4 bg-gray-50 rounded-md">
              <div className="flex items-center mb-2">
                <Package size={16} className="mr-2 text-gray-600" />
                <h4 className="font-medium text-gray-800">{product.name}</h4>
              </div>
              <div className="flex items-center text-green-700">
                <DollarSign size={16} className="mr-1" />
                <span className="font-semibold">${product.price.toFixed(2)}</span>
                <span className="ml-1 text-gray-500">per unit</span>
              </div>
              {product.description && (
                <p className="mt-2 text-sm text-gray-600">{product.description}</p>
              )}
              {product.stock !== undefined && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">In Stock:</span> {product.stock} units
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={handleQuantityChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={submitting}
              />
            </div>
            
            <div className="bg-indigo-50 p-3 rounded-md">
              <div className="flex justify-between font-medium">
                <span>Total Price:</span>
                <span>${(product.price * quantity).toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Any special requirements or comments about this purchase request..."
                disabled={submitting}
              />
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseRequestModal; 