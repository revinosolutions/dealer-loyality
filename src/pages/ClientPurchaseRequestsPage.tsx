import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getPurchaseRequests, PurchaseRequest } from '../services/purchaseRequestsApi';

const ClientPurchaseRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    // Check if user is authenticated and is a client
    if (!user) return;
    if (user.role !== 'client') {
      navigate('/dashboard');
      return;
    }

    fetchPurchaseRequests();
  }, [user, navigate, selectedStatus, currentPage]);

  // Use a separate useEffect to ensure user data is properly loaded and logged
  useEffect(() => {
    if (user) {
      console.log('Client user info:', { 
        id: user.id, 
        _id: (user as any)._id,
        role: user.role,
        email: user.email
      });
    }
  }, [user]);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure we have a valid client ID
      const clientId = user?.id || (user as any)?._id;
      if (!clientId) {
        throw new Error('Unable to identify client account');
      }

      console.log('Fetching purchase requests for client:', clientId);

      // Get the authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Prepare filters for the API call
      const filters: any = {
        clientId,
        page: currentPage,
        limit: itemsPerPage,
        _t: Date.now() // Prevent caching
      };

      // Add status filter if not "all"
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }

      // Try multiple approaches to fetch client purchase requests
      let response = null;
      let errorMessages = [];

      // DIRECT DATABASE APPROACH
      // Try different endpoint formats to find the right one that works
      const endpointFormats = [
        // Base endpoints with variations
        `/api/purchase-requests?clientId=${clientId}`,
        `/api/purchase-requests/client/${clientId}`,
        `/purchase-requests?client=${clientId}`,
        `/purchase-requests?userId=${clientId}`,
        `/purchase-requests/user/${clientId}`,
        // Standard endpoints in use elsewhere in the app
        `/api/products/purchase-requests?clientId=${clientId}`,
        // Root api endpoints without clientId in query (will filter on backend)
        `/api/purchase-requests`,
        `/api/products/purchase-requests`
      ];

      // Add status filters if needed
      if (selectedStatus !== 'all') {
        endpointFormats.forEach((endpoint, index) => {
          if (endpoint.includes('?')) {
            endpointFormats[index] = `${endpoint}&status=${selectedStatus}`;
          } else {
            endpointFormats[index] = `${endpoint}?status=${selectedStatus}`;
          }
        });
      }
      
      // Try each endpoint format
      for (const endpoint of endpointFormats) {
        try {
          console.log(`Trying direct database connection via endpoint: ${endpoint}`);
          
          // Add cache busting parameter
          const finalEndpoint = endpoint.includes('?') 
            ? `${endpoint}&_t=${Date.now()}` 
            : `${endpoint}?_t=${Date.now()}`;
            
          const directResponse = await fetch(finalEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Client-ID': clientId, // Add client ID in header as well
              'x-auth-token': token, // Add x-auth-token that might be used by the API
              'X-User-Role': 'client' // Explicitly specify client role
            }
          });
          
          if (directResponse.ok) {
            const data = await directResponse.json();
            console.log(`Success with endpoint ${endpoint}:`, data);
            
            // Process response data based on format
            if (Array.isArray(data)) {
              response = { 
                requests: data,
                pagination: { total: data.length } 
              };
              console.log('Found requests array directly in response');
              break;
            } else if (data.requests && Array.isArray(data.requests)) {
              response = data;
              console.log('Found requests in data.requests property');
              break;
            } else if (data.data && Array.isArray(data.data)) {
              response = { 
                requests: data.data,
                pagination: { total: data.data.length } 
              };
              console.log('Found requests in data.data property');
              break;
            } else if (data.purchaseRequests && Array.isArray(data.purchaseRequests)) {
              response = { 
                requests: data.purchaseRequests,
                pagination: { total: data.purchaseRequests.length } 
              };
              console.log('Found requests in data.purchaseRequests property');
              break;
            } else {
              // Try to find any array property that might contain our requests
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  response = { 
                    requests: data[key],
                    pagination: { total: data[key].length } 
                  };
                  console.log(`Found requests array in data.${key}`);
                  break;
                }
              }
              if (response) break;
            }
          } else {
            const statusText = directResponse.statusText || 'Unknown error';
            const status = directResponse.status;
            errorMessages.push(`Endpoint ${endpoint} failed: ${status} ${statusText}`);
            console.warn(`Endpoint ${endpoint} failed: ${status} ${statusText}`);
            
            // If we got a 401 or 403, we might have auth issues
            if (status === 401 || status === 403) {
              console.error('Authorization error detected. Token might be invalid.');
            }
          }
        } catch (err: any) {
          errorMessages.push(`Error with endpoint ${endpoint}: ${err.message}`);
          console.warn(`Error with endpoint ${endpoint}:`, err.message);
        }
      }

      // Special client-only direct access approach
      if (!response) {
        try {
          console.log('Attempting special client-only direct database access');
          
          // Create a special request with client role explicitly provided
          const clientDirectEndpoint = `/api/client-only/purchase-requests?t=${Date.now()}`;
          
          // Use ALL possible client identifiers in the request
          const clientDirectResponse = await fetch(clientDirectEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Auth-Token': token,
              'X-Client-ID': clientId,
              'X-User-ID': clientId,
              'X-User-Role': 'client'
            }
          });
          
          if (clientDirectResponse.ok) {
            const data = await clientDirectResponse.json();
            console.log('Client-only direct endpoint succeeded:', data);
            
            // Format the data appropriately
            if (Array.isArray(data)) {
              response = { requests: data, pagination: { total: data.length } };
            } else if (data.requests && Array.isArray(data.requests)) {
              response = data;
            } else if (data.purchaseRequests && Array.isArray(data.purchaseRequests)) {
              response = { requests: data.purchaseRequests, pagination: { total: data.purchaseRequests.length } };
            } else if (typeof data === 'object' && data !== null) {
              // Check for any array in the response
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  response = { requests: data[key], pagination: { total: data[key].length } };
                  break;
                }
              }
            }
          } else {
            console.error('Client-only direct endpoint failed:', clientDirectResponse.status, clientDirectResponse.statusText);
          }
        } catch (clientDirectErr) {
          console.error('Client-only direct endpoint error:', clientDirectErr);
        }
      }

      if (!response) {
        // Final desperate attempt - direct MongoDB-style query
        // This is a last resort approach
        try {
          console.log('🆘 FINAL ATTEMPT - Direct database query simulation');
          
          // Get as much client identification as possible
          let userInfo = null;
          try {
            const userJson = localStorage.getItem('user');
            if (userJson) userInfo = JSON.parse(userJson);
          } catch (e) {
            console.warn('Could not parse user info');
          }
          
          // MongoDB-style query building
          const findQuery = {
            clientId: { 
              $in: [
                clientId, 
                { $toString: clientId },
                userInfo?.id,
                userInfo?._id,
                user?.id,
                (user as any)?._id
              ].filter(Boolean)
            }
          };
          
          // Stringify the query to send it to the server
          const queryParam = encodeURIComponent(JSON.stringify(findQuery));
          
          // Build a URL that looks like direct MongoDB access
          const mongoDirectEndpoint = `/api/client-only/purchase-requests/direct-db?query=${queryParam}&t=${Date.now()}`;
          
          const mongoDirectResponse = await fetch(mongoDirectEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Client-Direct-DB': 'true',
              'X-Client-ID': clientId
            }
          });
          
          if (mongoDirectResponse.ok) {
            const data = await mongoDirectResponse.json();
            console.log('MongoDB-style direct query succeeded:', data);
            
            if (data && Array.isArray(data.results)) {
              response = { 
                requests: data.results,
                pagination: { total: data.results.length }
              };
            }
          }
        } catch (finalErr) {
          console.error('Final direct MongoDB-style attempt failed:', finalErr);
        }
      }

      // If we have a response, process it
      if (response && response.requests) {
        console.log(`Processing ${response.requests.length} purchase requests`);
        
        // Ensure we have complete product data for each request
        const processedRequests = response.requests.map((request: any) => ({
          ...request,
          product: request.product || {
            name: request.productName || 'Unknown Product',
            sku: request.productId || request.sku || 'N/A',
            price: request.price || 0
          },
          status: request.status || 'pending',
          createdAt: request.createdAt || new Date().toISOString(),
          _id: request._id || request.id // Ensure we have an ID for linking
        }));
      
      // Apply client-side search filter if needed
        let filteredRequests = processedRequests;
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
          filteredRequests = filteredRequests.filter((request: any) => 
            (request.product?.name || '').toLowerCase().includes(search) ||
            (request.product?.sku || '').toLowerCase().includes(search) ||
            (request.notes || '').toLowerCase().includes(search)
        );
      }
      
      setRequests(filteredRequests);
      
      // Update pagination
      if (response.pagination) {
        setTotalPages(Math.ceil(response.pagination.total / itemsPerPage));
        } else {
          // Default pagination if not provided
          setTotalPages(Math.ceil(filteredRequests.length / itemsPerPage) || 1);
        }
        
        // If we got here successfully, clear any error
        setError(null);
      } else {
        // If all attempts failed
        const errorMsg = 'Unable to fetch your purchase requests. ' + 
          errorMessages.join('; ') + 
          '. Please try refreshing the page or contact support if the problem persists.';
        console.error(errorMsg);
        setError(errorMsg);
        setRequests([]);
        
        // Show toast with error summary
        toast.error('Could not load purchase requests. Please try again later.');
      }
    } catch (err: any) {
      console.error('Error fetching purchase requests:', err);
      setError(err.message || 'Failed to load purchase requests');
      toast.error('Error loading your purchase requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPurchaseRequests();
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle scenario where user is not yet loaded
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if not a client
  if (user.role !== 'client') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">This page is only available for client users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Purchase Requests</h1>
            <p className="text-gray-600">View and track your product purchase requests</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <Link
              to="/dashboard/admin-products-catalog"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Browse Products
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                fetchPurchaseRequests();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-64">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="relative">
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="w-full sm:flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                id="search"
                placeholder="Search by product name or SKU"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && requests.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No purchase requests found</h3>
            <p className="mt-1 text-gray-500">
              {selectedStatus !== 'all' 
                ? `You don't have any ${selectedStatus} purchase requests.` 
                : 'You have not submitted any purchase requests yet.'}
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard/admin-products-catalog"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Browse Products
              </Link>
            </div>
          </div>
        )}

        {/* Requests list */}
        {!loading && !error && requests.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity / Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                            {request.product?.images && request.product.images.length > 0 ? (
                              <img 
                                src={request.product.images[0]} 
                                alt={request.product?.name} 
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.product?.name || 'Unknown Product'}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {request.product?.sku || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request.quantity} units
                        </div>
                        <div className="text-sm text-gray-500">
                          ${request.price?.toFixed(2) || '0.00'} per unit
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          Total: ${(request.quantity * request.price).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        {request.status === 'rejected' && request.rejectionReason && (
                          <div className="mt-1 text-xs text-red-600 max-w-xs">
                            Reason: {request.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt || '').toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/dashboard/client-purchase-requests/${request._id}`}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end"
                        >
                          <span>Details</span>
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current page
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap in the sequence
                          const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                          const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsisBefore && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              
                              <button
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                                  page === currentPage
                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                              
                              {showEllipsisAfter && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientPurchaseRequestsPage; 