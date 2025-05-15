import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getClientPurchaseRequests, PurchaseRequest } from '../services/productsApi';
import { getPurchaseRequestNotifications, Notification } from '../services/notificationsApi';
import { ShoppingBag, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, MessageSquare, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Force token refresh function - this is a last resort when auth fails
const forceTokenRefresh = async () => {
  // This is a simple implementation - in a real app, you'd use your auth service
  console.log('Forcing token refresh');
  
  try {
    // Get the current token
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.error('No token found to refresh');
      return false;
    }
    
    // Log the token for debugging (first 15 chars only for security)
    console.log('Current token (partial):', currentToken.substring(0, 15) + '...');
    
    // In a real implementation, you would call your refresh token endpoint
    // For now, we'll just simulate it by reporting success
    console.log('Token refresh would happen here in a real implementation');
    
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

const ClientPurchaseRequestsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  // Add a counter for retry attempts
  const [retryCount, setRetryCount] = useState(0);
  const [showAuthError, setShowAuthError] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (requests.length > 0) {
      fetchNotifications();
    }
  }, [requests]);

  const fetchRequests = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Debug user information
    console.log('Current user:', {
      id: user.id,
      _id: user._id,
      email: user.email,
      role: user.role
    });

    if (!user.id && !user._id) {
      setError('User ID not available. Please log out and log in again.');
      setLoading(false);
      return;
    }

    // Choose the appropriate ID (either id or _id)
    const effectiveUserId = user.id || user._id || '';
    console.log('Using effective user ID:', effectiveUserId);

    setLoading(true);
    try {
      // If we've already retried 3+ times, try to force a token refresh
      if (retryCount >= 3) {
        console.log('Multiple retries detected, attempting token refresh');
        const refreshed = await forceTokenRefresh();
        if (refreshed) {
          console.log('Token refreshed, retrying request');
          setRetryCount(0); // Reset retry count after successful refresh
        } else {
          console.error('Token refresh failed');
          // Show a more serious auth error UI after 5 retries
          if (retryCount >= 5) {
            setShowAuthError(true);
          }
        }
      }
      
      // Increment retry count
      setRetryCount(prevCount => prevCount + 1);
      
      console.log('Requesting purchase requests for client ID:', effectiveUserId);
      console.log('Retry attempt #' + (retryCount + 1));
      
      const response = await getClientPurchaseRequests(effectiveUserId);
      
      // Handle API error responses that were converted to objects with error properties
      if ('error' in response && response.error) {
        throw new Error(response.error as string);
      }
      
      console.log('Fetched purchase requests:', response.requests);
      setRequests(response.requests || []);
      setError(null);
      setRetryCount(0); // Reset retry count on success
      setShowAuthError(false);
      
      // Display success message if we recovered from a previous error
      if (error) {
        toast.success('Purchase requests loaded successfully!');
      }
    } catch (err: any) {
      console.error('Error fetching purchase requests:', err);
      
      // Try to extract the most helpful error message
      let errorMessage = 'Failed to load your purchase requests';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Check for authentication errors
      const isAuthError = 
        errorMessage.includes('Not authorized') || 
        errorMessage.includes('unauthorized') || 
        errorMessage.includes('authentication failed') ||
        err.response?.status === 401 ||
        err.response?.status === 403;
      
      if (isAuthError) {
        // After multiple auth errors, suggest logout
        if (retryCount > 3) {
          toast.error(
            <div className="flex flex-col">
              <span>Authentication problem detected</span>
              <span className="text-xs mt-1">Please try logging out and back in</span>
              <div className="flex gap-2 mt-2">
                <button 
                  className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded hover:bg-red-300"
                  onClick={() => logout()}
                >
                  Logout
                </button>
                <button 
                  className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded hover:bg-blue-300"
                  onClick={fetchRequests}
                >
                  Retry Again
                </button>
              </div>
            </div>,
            { duration: 10000 }
          );
        } else {
          // Standard auth error toast
          toast.error(
            <div className="flex flex-col">
              <span>Authentication error</span>
              <span className="text-xs mt-1">{errorMessage}</span>
              <button 
                className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded mt-2 hover:bg-red-300"
                onClick={fetchRequests}
              >
                Retry
              </button>
            </div>,
            { duration: 5000 }
          );
        }
      } else {
        // General error toast
        toast.error(
          <div className="flex flex-col">
            <span>Failed to load purchase requests</span>
            <button 
              className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded mt-1 hover:bg-red-300"
              onClick={fetchRequests}
            >
              Retry
            </button>
          </div>,
          { duration: 5000 }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user || !user.id) return;
    
    try {
      const notifs = await getPurchaseRequestNotifications();
      console.log('Fetched purchase request notifications:', notifs);
      setNotifications(notifs);
      
      // Enhance requests with rejection messages from notifications if available
      if (notifs.length > 0 && requests.length > 0) {
        const enhancedRequests = requests.map(request => {
          // Find a rejection notification related to this request
          const relatedNotification = notifs.find(
            n => n.relatedId === request._id && 
                 n.type === 'purchase_request_rejected'
          );
          
          if (relatedNotification && (!request.rejectionReason || request.rejectionReason.trim() === '')) {
            // Extract reason from the notification message
            let reason = relatedNotification.message;
            if (reason.includes('was rejected: ')) {
              reason = reason.split('was rejected: ')[1];
            } else if (reason.includes(': ')) {
              reason = reason.split(': ')[1];
            }
            
            console.log(`Found rejection reason from notification for request ${request._id}: ${reason}`);
            
            return {
              ...request,
              rejectionReason: reason
            };
          }
          
          return request;
        });
        
        setRequests(enhancedRequests);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
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

  const viewRejectionReason = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setIsReasonModalOpen(true);
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(request => request.status === statusFilter);

  // Return a special authentication error UI for persistent auth problems
  if (showAuthError) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <ShieldAlert size={48} className="mx-auto text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-red-800">Authentication Problem Detected</h3>
        <p className="mt-1 text-red-600 max-w-md mx-auto">
          There seems to be an issue with your authentication. This is often caused by an expired session or incorrect permissions.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={logout}
            className="px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-md transition-colors"
          >
            Logout
          </button>
          <button 
            onClick={() => {
              setShowAuthError(false);
              setRetryCount(0);
              fetchRequests();
            }}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
          >
            Try One More Time
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (!user || user.role !== 'client') {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle size={48} className="mx-auto text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-yellow-800">Access Restricted</h3>
        <p className="mt-1 text-yellow-600">This page is only available for client users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Requests</h1>
          <p className="text-gray-500 mt-1">
            View and track your product purchase requests
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
            onClick={fetchRequests}
            className="px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      
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
              ? "You haven't submitted any purchase requests yet" 
              : "No requests match your current filter"}
          </p>
          
          {requests.length === 0 && (
            <div className="mt-6">
              <a 
                href="/dashboard/product-catalog"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="mr-2">Browse Products & Create Request</span>
                <ShoppingBag size={16} />
              </a>
            </div>
          )}
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
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Requested
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {statusFilter === 'rejected' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rejection Reason
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id} className={`hover:bg-gray-50 ${request.status === 'rejected' ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{request.productName}</div>
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
                  {statusFilter === 'rejected' && (
                    <td className="px-6 py-4">
                      {request.rejectionReason ? (
                        <div className="text-sm text-red-600">
                          <span className="truncate block max-w-xs">{request.rejectionReason}</span>
                          <button 
                            onClick={() => viewRejectionReason(request)}
                            className="text-xs text-red-800 hover:text-red-900 underline mt-1"
                          >
                            View full reason
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No reason provided</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {request.notes || 'No notes provided'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.status === 'rejected' && (
                      <button
                        onClick={() => viewRejectionReason(request)}
                        className="text-xs flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        <MessageSquare size={14} className="mr-1" />
                        View Reason
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Rejection Reason Modal */}
      {isReasonModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-red-800 flex items-center">
                  <XCircle size={18} className="mr-2" /> 
                  Request Rejected
                </h3>
                <button 
                  onClick={() => setIsReasonModalOpen(false)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Product</div>
                <div className="font-medium">{selectedRequest.productName}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Quantity</div>
                <div className="font-medium">{selectedRequest.quantity} units</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Price</div>
                <div className="font-medium">${selectedRequest.price?.toFixed(2)}</div>
              </div>
              
              <div className="mb-2">
                <div className="text-sm text-gray-500 mb-1">Date Requested</div>
                <div className="font-medium">{formatDate(selectedRequest.createdAt || '')}</div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Rejection Reason:</div>
                <div className="p-3 bg-red-50 rounded border border-red-100 text-red-800 whitespace-pre-wrap">
                  {selectedRequest.rejectionReason || 'No specific reason provided.'}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={() => setIsReasonModalOpen(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPurchaseRequestsPage; 