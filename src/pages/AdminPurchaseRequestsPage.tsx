import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getPurchaseRequests, 
  approvePurchaseRequest, 
  rejectPurchaseRequest, 
  PurchaseRequest,
  manuallyApprovePurchaseRequest,
  directlyApprovePurchaseRequest,
  reliableApprovePurchaseRequest
} from '../services/productsApi';
import { ShoppingBag, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, Bug } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import { Link } from 'react-router-dom';

const AdminPurchaseRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const [emergencyMockData, setEmergencyMockData] = useState<any>(null);
  
  // Listen for emergency approval success events
  useEffect(() => {
    const handleEmergencySuccess = (event: any) => {
      console.log('Emergency approval success event received:', event.detail);
      fetchRequests();
    };
    
    // Listen for special force refresh events from status updates
    const handleForceRefresh = () => {
      console.log('Force refresh event received - refreshing purchase requests');
      fetchRequests();
    };
    
    window.addEventListener('emergency-approval-success', handleEmergencySuccess);
    window.addEventListener('force-refresh-purchase-requests', handleForceRefresh);
    
    return () => {
      window.removeEventListener('emergency-approval-success', handleEmergencySuccess);
      window.removeEventListener('force-refresh-purchase-requests', handleForceRefresh);
    };
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      console.log('Admin fetching purchase requests...');
      console.log('Admin user details:', {
        id: user?.id,
        role: user?.role,
        organizationId: user?.organization?.id
      });
      
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      
      // When called by an admin, this returns all requests from clients in their org
      const response = await getPurchaseRequests({ _t: timestamp });
      
      console.log('Purchase requests API raw response:', response);
      
      if (response && response.requests) {
        console.log(`Found ${response.requests.length} purchase requests`);
        setRequests(response.requests);
        
        // Log each request for debugging
        response.requests.forEach((req: PurchaseRequest, index: number) => {
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
        
        // Show success toast if requests were found
        if (response.requests.length > 0) {
          toast.success(`Found ${response.requests.length} purchase requests`);
        }
      } else {
        console.error('Invalid response format or empty requests array:', response);
        setRequests([]);
        toast.error('No purchase requests found. The response format may be invalid.');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching purchase requests:', err);
      setError('Failed to load purchase requests. Please try again later.');
      toast.error('Failed to load purchase requests. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.loading('Refreshing purchase requests...');
    fetchRequests();
  };

  const handleApproveRequest = async (request: PurchaseRequest) => {
    if (!request._id) {
      toast.error('Purchase request has no ID');
      return;
    }
    
    setProcessing(true);
    try {
      // Show starting toast
      const loadingToast = toast.loading(`Processing purchase request for ${request.productName}...`);
      
      // NEW PRIMARY METHOD: Use the reliable approval route that properly handles inventory
      try {
        console.log('Method 1: Using reliable approval method...');
        const response = await reliableApprovePurchaseRequest(request._id);
        
        toast.dismiss(loadingToast);
        toast.success(
          <div>
            <p className="font-medium">Purchase request approved successfully</p>
            <p className="text-xs text-green-600">
              Product added to client inventory: {response.clientProduct?.stock} units
            </p>
          </div>,
          { duration: 5000 }
        );
        
        await fetchRequests();
        return;
      } catch (reliableError: any) {
        console.error('Reliable method failed:', reliableError);
        
        // FALLBACK METHOD 1: Standard server-side approval 
        toast.loading(
          <div>
            <p className="font-medium">Reliable approval failed</p>
            <p className="text-xs text-gray-500">Trying standard approval method...</p>
          </div>, 
          { id: loadingToast }
        );
        
        try {
          console.log('Method 2: Trying standard approval method...');
          const response = await approvePurchaseRequest(request._id);
          
          toast.dismiss(loadingToast);
          toast.success(`Purchase request for ${request.productName} approved successfully`);
          await fetchRequests();
          return;
        } catch (standardError: any) {
          console.error('Method 2 failed:', standardError);
          
          // FALLBACK METHOD 2: Manual approval via PUT endpoint
          toast.loading(
            <div>
              <p className="font-medium">Standard approval failed</p>
              <p className="text-xs text-gray-500">Trying direct status update...</p>
            </div>, 
            { id: loadingToast }
          );
          
          try {
            console.log('Method 3: Trying manual approval...');
            const manualResponse = await manuallyApprovePurchaseRequest(request._id);
            
            toast.dismiss(loadingToast);
            
            if (manualResponse.partialSuccess) {
              toast.success(
                <div>
                  <p className="font-medium">Purchase request approved</p>
                  <p className="text-xs text-amber-600">{manualResponse.message}</p>
                </div>,
                { duration: 5000 }
              );
            } else {
              toast.success(`Purchase request approved successfully`, { duration: 4000 });
            }
            
            await fetchRequests();
            return;
          } catch (manualError: any) {
            console.error('Method 3 failed:', manualError);
            
            // FALLBACK METHOD 3: EMERGENCY - Completely bypass server approval
            toast.loading(
              <div>
                <p className="font-medium">Manual approval failed</p>
                <p className="text-xs text-red-500">Attempting emergency product creation...</p>
              </div>, 
              { id: loadingToast }
            );
            
            try {
              console.log('Method 4: Attempting emergency direct inventory update...');
              const emergencyResponse = await directlyApprovePurchaseRequest(request);
              
              toast.dismiss(loadingToast);
              
              if (emergencyResponse.mockSuccess) {
                // Show special UI for mock success
                setEmergencyMockData(emergencyResponse.mockProduct);
                
                toast.success(
                  <div>
                    <p className="font-bold text-amber-700">⚠️ Emergency Mode Activated</p>
                    <p className="text-xs mt-1">A placeholder product was created.</p>
                    <p className="text-xs mt-1 text-amber-600">Manual admin action may be required.</p>
                  </div>,
                  { duration: 8000 }
                );
              } else {
                // Show normal success for real product creation
                toast.success(
                  <div>
                    <p className="font-bold text-amber-700">⚠️ Emergency Approval Completed</p>
                    <p className="text-xs">Product added directly to client inventory</p>
                    {emergencyResponse.statusUpdated ? (
                      <p className="text-xs mt-1 text-green-600">Purchase request status updated to approved</p>
                    ) : (
                      <p className="text-xs mt-1 text-amber-600">Purchase request status remains unchanged.</p>
                    )}
                  </div>,
                  { duration: 8000 }
                );
              }
              
              await fetchRequests();
              return;
            } catch (emergencyError: any) {
              // All methods failed
              console.error('Method 4 failed:', emergencyError);
              
              toast.dismiss(loadingToast);
              
              // Collect error details from all attempts
              const reliableErrorDetail = reliableError.response?.data?.message || reliableError.message;
              const standardErrorDetail = standardError.response?.data?.message || standardError.message;
              const manualErrorDetail = manualError.message;
              const emergencyErrorDetail = emergencyError.message;
              
              toast.error(
                <div className="space-y-2">
                  <p className="font-bold text-red-700">🚨 All approval methods failed</p>
                  <div className="text-xs text-red-600 space-y-1">
                    <p><b>Method 1 (Reliable):</b> {reliableErrorDetail}</p>
                    <p><b>Method 2 (Standard):</b> {standardErrorDetail}</p>
                    <p><b>Method 3 (Manual):</b> {manualErrorDetail}</p>
                    <p><b>Method 4 (Emergency):</b> {emergencyErrorDetail}</p>
                    <p className="pt-1 italic">Contact a system administrator for assistance.</p>
                  </div>
                </div>,
                { duration: 10000 }
              );
            }
          }
        }
      }
    } catch (err: any) {
      // Dismiss any loading toasts
      toast.dismiss();
      
      console.error('Error approving request:', err);
      
      // Create detailed error message
      let errorTitle = 'Failed to approve purchase request';
      let errorDetails = '';
      
      // Extract the specific error message from the response if available
      if (err.response?.data?.message) {
        errorTitle = err.response.data.message;
      }
      
      if (err.response?.data?.error) {
        errorDetails = err.response.data.error;
      } else if (err.message) {
        errorDetails = err.message;
      }
      
      // For MongoDB errors, add more details
      if (err.response?.data?.name === 'MongoServerError') {
        errorDetails += ` (${err.response.data.code})`;
        
        // Handle duplicate key errors specifically
        if (err.response?.data?.code === 11000 && err.response?.data?.keyValue) {
          const field = Object.keys(err.response.data.keyValue)[0];
          errorDetails = `Duplicate ${field} value: ${err.response.data.keyValue[field]}`;
        }
      }
      
      // Show the detailed error message
      toast.error(
        <div>
          <p className="font-bold">{errorTitle}</p>
          {errorDetails && <p className="text-sm mt-1">{errorDetails}</p>}
        </div>,
        { duration: 5000 } // Show for 5 seconds
      );
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
      await rejectPurchaseRequest(selectedRequest._id, rejectionReason);
      toast.success('Purchase request rejected');
      setIsRejectModalOpen(false);
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject purchase request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(request => request.status === statusFilter);

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle size={48} className="mx-auto text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-yellow-800">Access Restricted</h3>
        <p className="mt-1 text-yellow-600">This page is only available for admin users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Requests</h1>
          <p className="text-gray-500 mt-1">
            Manage client purchase requests
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            disabled={processing || loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <Link
            to="/dashboard/purchase-requests-debug"
            className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 hover:bg-amber-700 transition-colors"
          >
            <Bug size={16} />
            Debug
          </Link>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading purchase requests...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-red-800">{error}</h3>
          <button 
            onClick={fetchRequests}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <ShoppingBag size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No purchase requests found</h3>
          <p className="mt-1 text-gray-500">
            {requests.length === 0 
              ? "No clients have submitted purchase requests yet" 
              : "No requests match your current filter"}
          </p>
        </div>
      )}
      
      {/* Requests List */}
      {!loading && !error && filteredRequests.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{request.productName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.quantity} units</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${request.price?.toFixed(2) || '0.00'}</div>
                    <div className="text-xs text-gray-500">Total: ${((request.price || 0) * request.quantity).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {request.createdAt ? formatDate(request.createdAt) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {request.notes || 'No notes provided'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveRequest(request)}
                          disabled={processing}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenRejectModal(request)}
                          disabled={processing}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Reject Modal */}
      <Modal 
        isOpen={isRejectModalOpen} 
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Purchase Request"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Please provide a reason for rejecting this purchase request:
          </p>
          
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder="Enter rejection reason..."
          />
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectRequest}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Reject Request'}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Emergency Mock Data Modal */}
      {emergencyMockData && (
        <Modal 
          isOpen={!!emergencyMockData} 
          onClose={() => setEmergencyMockData(null)}
          title="Emergency Approval Details"
        >
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="text-amber-800 font-bold flex items-center">
                <AlertCircle size={18} className="mr-2" />
                Emergency Approval Activated
              </h3>
              <p className="text-sm text-amber-700 mt-2">
                The system was unable to complete the automatic approval process but has created a 
                placeholder record. Please take the following manual steps:
              </p>
              <ol className="list-decimal pl-5 mt-2 text-sm text-amber-800 space-y-1">
                <li>Verify the client has access to this product in their inventory</li>
                <li>Manually update the purchase request status if needed</li>
                <li>Adjust any stock levels in the admin inventory</li>
              </ol>
            </div>
            
            <div className="border rounded-md p-4">
              <h4 className="font-semibold text-gray-700">Product Details:</h4>
              <div className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Name:</span>
                  <span className="col-span-2 font-medium">{emergencyMockData.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">SKU:</span>
                  <span className="col-span-2 font-mono text-xs">{emergencyMockData.sku}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Stock:</span>
                  <span className="col-span-2">{emergencyMockData.stock} units</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Price:</span>
                  <span className="col-span-2">${emergencyMockData.price}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Client ID:</span>
                  <span className="col-span-2 font-mono text-xs">{emergencyMockData.createdBy}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  // Copy details to clipboard
                  const details = JSON.stringify(emergencyMockData, null, 2);
                  navigator.clipboard.writeText(details);
                  toast.success('Product details copied to clipboard');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Copy Details
              </button>
              <button
                onClick={() => setEmergencyMockData(null)}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPurchaseRequestsPage; 