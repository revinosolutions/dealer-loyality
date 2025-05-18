import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getClientPurchaseRequests, PurchaseRequest } from '../services/productsApi';
import { getPurchaseRequestNotifications, Notification } from '../services/notificationsApi';
import { ShoppingBag, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, MessageSquare, Bell, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Update the PurchaseRequest interface to include rejectionReason
declare module '../services/productsApi' {
  interface PurchaseRequest {
    rejectionReason?: string;
  }
}

const PurchaseRequestsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);

  // Wait for auth to finish loading before trying to fetch data
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user) {
        fetchRequests();
      } else if (!isAuthenticated) {
        setError('You must be logged in to view purchase requests');
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, user]);
  const fetchRequests = async () => {
    // Show loading state immediately
    setLoading(true);
    
    // Enhanced client verification
    const verifyClientUser = async () => {
      // First check if user and ID exist in state
      if (user && user.id) {
        console.log('User authenticated from context, client ID:', user.id);
        return user.id;
      }
      
      // If not in context, check localStorage as backup
      console.log('User not found in context, checking localStorage');
      try {
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          if (storedUser && storedUser.id) {
            console.log('User found in localStorage, ID:', storedUser.id);
            return storedUser.id;
          }
        }
      } catch (e) {
        console.error('Error checking localStorage for user:', e);
      }
      
      // Final check - see if there's a token but no user data
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Token found but no user data, attempting to refresh user info');
        try {
          // Make a direct API call to get current user
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData && userData.id) {
              console.log('Successfully retrieved user data from API');
              localStorage.setItem('user', JSON.stringify(userData));
              return userData.id;
            }
          }
        } catch (apiError) {
          console.error('Failed to retrieve user info from API:', apiError);
        }
      }
      
      // No valid user found
      return null;
    };
    
    // Get client ID using our enhanced verification
    const clientId = await verifyClientUser();
    
    if (!clientId) {
      console.error('No authenticated user found');
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      // Redirect to login after a short delay
      toast.error('Your session has expired. Please log in again.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    try {
      console.log('Fetching purchase requests for client ID:', clientId);
      // Add timestamp to prevent caching issues
      const response = await getClientPurchaseRequests(clientId);
      
      // Handle different response formats (array or {requests: array})
      if (!response) {
        console.error('Empty response from getClientPurchaseRequests');
        setRequests([]);
        setError('Received empty data from server. Please try again.');
      } else if (Array.isArray(response)) {
        // Direct array response
        console.log(`Fetched ${response.length} purchase requests (array format)`);
        setRequests(response);
        setError(null);
        
        // Fetch notifications after successful request fetch
        fetchNotifications();
        
        // Cache the results in localStorage for emergency use
        try {
          localStorage.setItem('client_purchase_requests', JSON.stringify(response));
          console.log('Cached client purchase requests to localStorage');
        } catch (cacheError) {
          console.warn('Failed to cache client purchase requests:', cacheError);
        }
      } else if (response && typeof response === 'object' && 'requests' in response) {
        // Object with requests property
        console.log(`Fetched ${response.requests.length} purchase requests (object format)`);
        setRequests(response.requests);
        setError(null);
        
        // Fetch notifications after successful request fetch
        fetchNotifications();
        
        // Cache the results in localStorage for emergency use
        try {
          localStorage.setItem('client_purchase_requests', JSON.stringify(response.requests));
          console.log('Cached client purchase requests to localStorage');
        } catch (cacheError) {
          console.warn('Failed to cache client purchase requests:', cacheError);
        }
      } else {
        console.error('Invalid response format from getClientPurchaseRequests:', response);
        setRequests([]);
        setError('Received invalid data from server. Please try again.');
      }
    } catch (err: any) {
      console.error('Error fetching purchase requests:', err);
      setError(err.message || 'Failed to load your purchase requests. Please try again later.');
      
      // Handle authentication errors specifically
      if (err.message?.includes('Authentication required') || 
          (err.response && (err.response.status === 401 || err.response.status === 403))) {
        toast.error('Your session has expired. Please log in again.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
      
      // Try to load from cache if available
      try {
        const cachedRequests = localStorage.getItem('client_purchase_requests');
        if (cachedRequests) {
          const parsedRequests = JSON.parse(cachedRequests);
          console.log(`Loaded ${parsedRequests.length} cached purchase requests`);
          setRequests(parsedRequests);
          toast.success('Showing cached purchase requests while we try to reconnect');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached requests:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Add auto-refresh functionality
  useEffect(() => {
    // Set up an interval to refresh the requests every 30 seconds
    const refreshInterval = setInterval(() => {
      if (isAuthenticated && user) {
        console.log('Auto-refreshing purchase requests...');
        fetchRequests();
      }
    }, 30000); // 30 seconds
    
    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, user]);

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

  // If authentication is still loading, show a loading state
  if (authLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Verifying your access...</p>
      </div>
    );
  }

  // If not authenticated or wrong role, show access denied
  if (!isAuthenticated || !user || user.role !== 'client') {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle size={48} className="mx-auto text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-yellow-800">Access Restricted</h3>
        <p className="mt-1 text-yellow-600">
          {!isAuthenticated 
            ? 'You must be logged in to access this page.' 
            : 'This page is only available for client users.'}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          <LogIn size={16} className="mr-2" />
          Go to Login
        </button>
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
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading your purchase requests...</p>
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
              ? "You haven't submitted any purchase requests yet" 
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

export default PurchaseRequestsPage;