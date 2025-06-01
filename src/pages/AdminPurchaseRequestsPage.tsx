import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Check, 
  X, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  RefreshCcw,
  Package,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getPurchaseRequests,
  updatePurchaseRequestStatus,
  PurchaseRequest as BasePurchaseRequest,
  getPurchaseRequestStats
} from '../services/purchaseRequestsApi';
import { reliableApprovePurchaseRequest, rejectPurchaseRequest } from '../services/productsApi';
import Modal from '../components/Modal';

// Extend the PurchaseRequest interface to include the properties we need
interface PurchaseRequest extends BasePurchaseRequest {
  productName?: string;
  clientName?: string;
  productId: string | any; // Can be string ID or populated object
  clientId: string | any;  // Can be string ID or populated object
}

// Add this after imports - create a custom event for inventory updates
const INVENTORY_UPDATE_EVENT = 'inventory-updated';

// Create a function to trigger inventory refresh across components
const triggerInventoryRefresh = () => {
  console.log('[AdminPurchaseRequestsPage] Broadcasting inventory update event');
  // Dispatch a custom event that other components can listen for
  window.dispatchEvent(new CustomEvent(INVENTORY_UPDATE_EVENT));
  // Also store a timestamp in localStorage to force refresh on page navigation
  localStorage.setItem('lastInventoryUpdate', Date.now().toString());
};

const AdminPurchaseRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    total: 0
  });
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchPurchaseRequests();
    fetchStats();
  }, [user, navigate, selectedStatus, currentPage]);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare filters for the API call
      const filters: any = {
        page: currentPage,
        limit: itemsPerPage,
        _t: Date.now() // Prevent caching
      };

      // Add status filter if not "all"
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }

      // Add organization filter if available
      if (user?.organization?.id) {
        filters.organizationId = user.organization.id;
      }

      console.log('Fetching purchase requests with filters:', filters);
      const response = await getPurchaseRequests(filters);
      
      console.log(`Fetched ${response.requests?.length || 0} purchase requests`);
      console.log('Purchase request data sample:', response.requests?.[0]);
      
      // Log detailed structure of the first request to diagnose issues
      if (response.requests?.[0]) {
        const firstRequest = response.requests[0];
        console.log('First request detailed structure:');
        console.log('- _id:', firstRequest._id);
        console.log('- productId:', firstRequest.productId);
        console.log('- productName:', firstRequest.productName);
        console.log('- clientId:', firstRequest.clientId);
        console.log('- clientName:', firstRequest.clientName);
        console.log('- product object:', firstRequest.product);
        console.log('- client object:', firstRequest.client);
        
        // Check if productId/clientId are objects with properties
        if (firstRequest.productId && typeof firstRequest.productId === 'object') {
          console.log('- productId is an object with properties:');
          console.log('  - name:', (firstRequest.productId as any).name);
          console.log('  - sku:', (firstRequest.productId as any).sku);
        }
        
        if (firstRequest.clientId && typeof firstRequest.clientId === 'object') {
          console.log('- clientId is an object with properties:');
          console.log('  - name:', (firstRequest.clientId as any).name);
          console.log('  - email:', (firstRequest.clientId as any).email);
        }
      }
      
      // Validate response data
      if (!response || !Array.isArray(response.requests)) {
        console.error('Invalid purchase request response:', response);
        setError('Received invalid data from server');
        setRequests([]);
        return;
      }
      
      // Apply client-side search filter if needed
      let filteredRequests = response.requests;
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filteredRequests = filteredRequests.filter((request: PurchaseRequest) => 
          (request.product?.name || '').toLowerCase().includes(search) ||
          (request.product?.sku || '').toLowerCase().includes(search) ||
          (request.client?.name || '').toLowerCase().includes(search) ||
          (request.client?.email || '').toLowerCase().includes(search)
        );
      }
      
      // Enrich request data for display
      const enrichedRequests = filteredRequests.map((request: PurchaseRequest) => {
        // Create product display data from productId (populated) or fall back to productName/productId
        const productData = request.productId ? {
          name: (request.productId as any).name || request.productName || 'Unknown Product',
          sku: (request.productId as any).sku || 'N/A',
          price: (request.productId as any).price || request.price || 0,
          images: (request.productId as any).images || [],
          category: (request.productId as any).category || ''
        } : {
          name: request.productName || 'Unknown Product',
          sku: request.productId || 'Unknown',
          price: request.price || 0
        };

        // Create client display data from clientId (populated) or fall back to clientName/clientId
        const clientData = request.clientId ? {
          name: (request.clientId as any).name || request.clientName || 'Unknown Client',
          email: (request.clientId as any).email || 'N/A',
          company: (request.clientId as any).company || ''
        } : {
          name: request.clientName || 'Unknown Client',
          email: request.clientId || 'Unknown'
        };

        return {
          ...request,
          // Set product and client data
          product: request.product || productData,
          client: request.client || clientData,
          // Format dates for display
          createdAt: request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Unknown',
          updatedAt: request.updatedAt ? new Date(request.updatedAt).toLocaleString() : '-'
        };
      });
      
      setRequests(enrichedRequests);
      
      // Update pagination
      if (response.pagination) {
        const totalItems = response.pagination.total || enrichedRequests.length;
        setTotalPages(Math.ceil(totalItems / itemsPerPage));
      } else {
        // Fallback pagination if not provided by API
        setTotalPages(Math.ceil(enrichedRequests.length / itemsPerPage) || 1);
      }
    } catch (err: any) {
      console.error('Error fetching purchase requests:', err);
      setError(err.message || 'Failed to load purchase requests');
      setRequests([]); // Ensure we set an empty array to avoid rendering issues
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const organizationId = user?.organization?.id;
      const response = await getPurchaseRequestStats(organizationId);
      setStats(response);
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Do not set error state for stats to avoid blocking the main content
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

  const openActionModal = (request: PurchaseRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionNote('');
    setIsActionModalOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    try {
      setLoading(true);
      
      if (actionType === 'approve') {
        // Use the reliable approval method that handles inventory transfer
        try {
          console.log('Attempting to approve purchase request:', selectedRequest._id);
          const response = await reliableApprovePurchaseRequest(selectedRequest._id as string);
          
          // Show success message with inventory update information
          toast.success('Purchase request approved successfully');
          
          // Trigger inventory refresh for client components
          triggerInventoryRefresh();
          
          // Show enhanced inventory update notification with more details and links
          if (response?.adminProduct && response?.clientProduct) {
            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 divide-y divide-gray-200`}>
                <div className="p-4 pb-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-6 w-6 text-green-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-gray-900">Inventory Updated Successfully</p>
                      <p className="mt-1 text-sm text-gray-500">
                        The inventory has been updated based on the approved request.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Admin Inventory</h4>
                      <div className="bg-red-50 p-2 rounded-md border border-red-100 mb-2">
                        <p className="text-xs font-medium text-red-700">
                          {response.adminProduct.name}
                        </p>
                        <div className="mt-1 flex items-center">
                          <ArrowDown size={14} className="text-red-500 mr-1" />
                          <p className="text-sm font-semibold text-red-700">
                            {response.adminProduct.previousStock} → {response.adminProduct.newStock} units
                          </p>
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Client Inventory</h4>
                      <div className="bg-green-50 p-2 rounded-md border border-green-100">
                        <p className="text-xs font-medium text-green-700">
                          {response.clientProduct.name}
                        </p>
                        <div className="mt-1 flex items-center">
                          <ArrowUp size={14} className="text-green-500 mr-1" />
                          <p className="text-sm font-semibold text-green-700">
                            {response.clientProduct.isNew ? '0' : (response.clientProduct.stock - selectedRequest.quantity)} → {response.clientProduct.stock} units
                          </p>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          {response.clientProduct.isNew 
                            ? 'New product created in client inventory' 
                            : 'Existing product updated in client inventory'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 flex">
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ), { duration: 8000 });
          } else {
            console.warn('Approval successful but API response missing product details:', response);
          }
        } catch (approvalError: any) {
          console.error('Error during purchase request approval:', approvalError);
          
          // Handle specific approval errors with better user messages
          let errorMessage = approvalError.message || 'Failed to approve the purchase request';
          
          // Add more specific actions for different error types
          if (errorMessage.includes('permission') || errorMessage.includes('403')) {
            toast.error('You do not have permission to approve this request', {
              duration: 5000,
            });
          } else if (errorMessage.includes('stock') || errorMessage.includes('inventory')) {
            toast.error('Failed to update inventory during approval. Please try again.', {
              duration: 5000,
            });
          } else {
            toast.error(errorMessage, {
              duration: 5000,
            });
          }
          
          // Close modal but don't clear selection if approval failed
          setIsActionModalOpen(false);
          setLoading(false);
          return;
        }
      } else {
        // For rejection, use the reject API with rejection reason
        try {
          await rejectPurchaseRequest(selectedRequest._id as string, actionNote);
          toast.success('Purchase request rejected successfully');
        } catch (rejectionError: any) {
          console.error('Error rejecting request:', rejectionError);
          toast.error(rejectionError.message || 'Failed to reject the request');
          
          // Close modal but don't clear selection if rejection failed
          setIsActionModalOpen(false);
          setLoading(false);
          return;
        }
      }
      
      // Refresh data
      fetchPurchaseRequests();
      fetchStats();
      
      // Close modal
      setIsActionModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setActionNote('');
    } catch (err: any) {
      console.error(`General error in ${actionType} operation:`, err);
      toast.error(err.message || `Failed to ${actionType} the request - please try again`);
    } finally {
      setLoading(false);
    }
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

  // Redirect if not an admin
  if (user.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view purchase requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Purchase Requests</h1>
            <p className="text-gray-600">Manage purchase requests from clients</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => {
                setLoading(true);
                fetchPurchaseRequests();
                fetchStats();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <h3 className="text-xs font-medium text-indigo-500 uppercase">Total</h3>
            <p className="mt-1 text-2xl font-semibold text-indigo-800">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <h3 className="text-xs font-medium text-yellow-500 uppercase">Pending</h3>
            <p className="mt-1 text-2xl font-semibold text-yellow-800">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="text-xs font-medium text-green-500 uppercase">Approved</h3>
            <p className="mt-1 text-2xl font-semibold text-green-800">{stats.approved}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h3 className="text-xs font-medium text-red-500 uppercase">Rejected</h3>
            <p className="mt-1 text-2xl font-semibold text-red-800">{stats.rejected}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-xs font-medium text-blue-500 uppercase">Completed</h3>
            <p className="mt-1 text-2xl font-semibold text-blue-800">{stats.completed}</p>
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
                placeholder="Search by product name, SKU, or client name"
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
                ? `There are no ${selectedStatus} purchase requests at this time.` 
                : 'There are no purchase requests matching your filters.'}
            </p>
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
                      Client
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
                  {requests.map((request) => {
                    // Extract product and client info for display
                    const productName = 
                      (request.productId && typeof request.productId === 'object' && (request.productId as any).name) ||
                      request.product?.name || 
                      request.productName || 
                      'Unknown Product';
                      
                    const productSku = 
                      (request.productId && typeof request.productId === 'object' && (request.productId as any).sku) ||
                      request.product?.sku || 
                      'N/A';
                      
                    const productImage = 
                      (request.productId && typeof request.productId === 'object' && (request.productId as any).images?.length > 0 && (request.productId as any).images[0]) ||
                      request.product?.images?.[0];
                      
                    const clientName = 
                      (request.clientId && typeof request.clientId === 'object' && (request.clientId as any).name) ||
                      request.client?.name || 
                      request.clientName || 
                      'Unknown Client';
                      
                    const clientEmail = 
                      (request.clientId && typeof request.clientId === 'object' && (request.clientId as any).email) ||
                      request.client?.email || 
                      'No email';
                    
                    return (
                      <tr key={request._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                              {productImage ? (
                                <img 
                                  src={productImage} 
                                  alt={productName} 
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {productName}
                              </div>
                              <div className="text-sm text-gray-500">
                                SKU: {productSku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {clientName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {clientEmail}
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.createdAt || '').toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {request.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openActionModal(request, 'approve')}
                                className="text-green-600 hover:text-green-900"
                                title="Approve"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openActionModal(request, 'reject')}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <Link
                              to={`/admin/purchase-requests/${request._id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Action Modal */}
      {selectedRequest && (
        <Modal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Purchase Request`}
        >
          <div className="p-6">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              {/* Extract product and client info for display */}
              {(() => {
                const productName = 
                  (selectedRequest.productId && typeof selectedRequest.productId === 'object' && (selectedRequest.productId as any).name) ||
                  selectedRequest.product?.name || 
                  selectedRequest.productName || 
                  'Unknown Product';
                  
                const clientName = 
                  (selectedRequest.clientId && typeof selectedRequest.clientId === 'object' && (selectedRequest.clientId as any).name) ||
                  selectedRequest.client?.name || 
                  selectedRequest.clientName || 
                  'Unknown Client';
                
                return (
                  <>
                    <div className="flex items-center mb-2">
                      <div className="font-semibold text-gray-700">Product:</div>
                      <div className="ml-2">{productName}</div>
                    </div>
                    <div className="flex items-center mb-2">
                      <div className="font-semibold text-gray-700">Client:</div>
                      <div className="ml-2">{clientName}</div>
                    </div>
                    <div className="flex items-center mb-2">
                      <div className="font-semibold text-gray-700">Quantity:</div>
                      <div className="ml-2">{selectedRequest.quantity} units</div>
                    </div>
                    <div className="flex items-center">
                      <div className="font-semibold text-gray-700">Total Price:</div>
                      <div className="ml-2">${(selectedRequest.quantity * selectedRequest.price).toFixed(2)}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
              </label>
              <textarea
                id="notes"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                required={actionType === 'reject'}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={actionType === 'approve' 
                  ? "Add any notes about this approval" 
                  : "Please provide a reason for rejection"}
              />
              {actionType === 'reject' && actionNote.trim() === '' && (
                <p className="mt-1 text-xs text-red-500">Rejection reason is required</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={loading || (actionType === 'reject' && actionNote.trim() === '')}
                className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Processing...' : actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPurchaseRequestsPage;