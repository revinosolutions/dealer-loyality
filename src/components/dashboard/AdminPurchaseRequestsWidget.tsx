import React, { useState, useEffect } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle, XCircle, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPurchaseRequests, approvePurchaseRequest, rejectPurchaseRequest, reliableApprovePurchaseRequest, PurchaseRequest } from '../../services/productsApi';
import { toast } from 'react-hot-toast';
import Modal from '../../components/Modal';

const AdminPurchaseRequestsWidget: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  // Add states for the rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      console.log('AdminPurchaseRequestsWidget: Fetching pending purchase requests');
      
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const response = await getPurchaseRequests({ _t: timestamp, status: 'pending' });
      
      console.log('AdminPurchaseRequestsWidget: API response:', response);
      
      // Handle the case where the API returns an array directly
      let requestsData: PurchaseRequest[] = [];
      
      if (Array.isArray(response)) {
        // API returned array directly
        requestsData = response;
        console.log(`AdminPurchaseRequestsWidget: API returned array with ${requestsData.length} pending requests`);
      } else if (response && response.requests) {
        // API returned an object with a requests property
        requestsData = response.requests;
        console.log(`AdminPurchaseRequestsWidget: Found ${requestsData.length} pending requests in response.requests`);
      } else {
        console.error('AdminPurchaseRequestsWidget: Invalid response format');
        requestsData = [];
      }
      
      setRequests(requestsData);
      
      // Log each request for debugging
      if (requestsData.length > 0) {
        requestsData.forEach((req, index) => {
          console.log(`Request ${index + 1}:`, {
            id: req._id,
            product: req.productName,
            client: req.clientName,
            clientId: req.clientId,
            status: req.status,
            quantity: req.quantity,
            price: req.price
          });
        });
      }
    } catch (error) {
      console.error('AdminPurchaseRequestsWidget: Error fetching purchase requests:', error);
      toast.error('Failed to load purchase requests');
    } finally {
      setLoading(false);
    }
  };

  // Add functions to handle approve and reject actions
  const handleApproveRequest = async (request: PurchaseRequest) => {
    if (!request._id) return;
    
    setProcessing(true);
    try {
      // Use the reliable approval method that properly handles inventory transfers
      const response = await reliableApprovePurchaseRequest(request._id);
      
      // Show success message with inventory update information
      toast.success('Purchase request approved successfully');
      
      // Show additional toast with inventory update information
      if (response.adminProduct && response.clientProduct) {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Inventory Updated
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Admin inventory: {response.adminProduct.name} reduced to {response.adminProduct.newStock} units
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Client inventory: {response.clientProduct.stock} units of {response.clientProduct.name} {response.clientProduct.isNew ? 'created' : 'updated'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      }
      
      await fetchRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve purchase request');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenRejectModal = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest?._id) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await rejectPurchaseRequest(selectedRequest._id, rejectionReason);
      toast.success('Purchase request rejected successfully');
      
      // Show additional toast with information about client notification
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <Bell size={20} className="text-blue-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Client notified
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  The client has been notified about the request rejection with your provided reason.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Dismiss
            </button>
          </div>
        </div>
      ), { duration: 5000 });
      
      setIsRejectModalOpen(false);
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject purchase request');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <ShoppingBag className="inline-block mr-2 h-5 w-5 text-indigo-600" />
          Pending Purchase Requests
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={fetchRequests}
            className="p-1 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link 
            to="/dashboard/purchase-requests"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View All
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.slice(0, 3).map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {request.productName}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {request.clientName}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {request.quantity}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    ${request.price?.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveRequest(request)}
                        disabled={processing}
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center"
                        title="Approve request"
                      >
                        <CheckCircle size={12} className="mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(request)}
                        disabled={processing}
                        className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex items-center"
                        title="Reject request"
                      >
                        <XCircle size={12} className="mr-1" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {requests.length > 3 && (
            <div className="text-center mt-3">
              <Link 
                to="/dashboard/purchase-requests"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                +{requests.length - 3} more requests
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <ShoppingBag size={24} className="mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No pending purchase requests</p>
        </div>
      )}
      
      {/* Reject Modal */}
      <Modal 
        isOpen={isRejectModalOpen} 
        onClose={() => !processing && setIsRejectModalOpen(false)}
        title="Reject Purchase Request"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-2">
            You are rejecting the purchase request for:
          </p>
          {selectedRequest && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p><strong>Product:</strong> {selectedRequest.productName}</p>
              <p><strong>Client:</strong> {selectedRequest.clientName}</p>
              <p><strong>Quantity:</strong> {selectedRequest.quantity}</p>
              <p><strong>Price:</strong> ${selectedRequest.price?.toFixed(2)}</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason:
            </label>
            <div className="relative">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                placeholder="Please provide a clear reason why you're rejecting this request. This message will be visible to the client."
                disabled={processing}
              />
              {rejectionReason.length > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {rejectionReason.length} characters
                </div>
              )}
            </div>
            {rejectionReason.trim() === '' && (
              <p className="mt-1 text-xs text-red-500">
                A rejection reason is required to continue
              </p>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            <p className="flex items-center">
              <Bell size={14} className="inline-block mr-1 text-blue-500" />
              The client will be notified of your rejection decision and reason.
            </p>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => !processing && setIsRejectModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectRequest}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={processing || rejectionReason.trim() === ''}
            >
              {processing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Rejecting...
                </span>
              ) : (
                'Reject Request'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPurchaseRequestsWidget;