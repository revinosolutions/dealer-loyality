import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, ErrorResponse } from '../services/api';
import { PurchaseRequest } from '../services/productsApi';
import { ShoppingBag, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminPurchaseRequestsDebugPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching debug data for admin...');
      console.log('Admin user details:', {
        id: user?.id,
        role: user?.role,
        organizationId: user?.organization?.id
      });
      
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      
      // Add more detailed logging
      console.log(`Making request to debug endpoint with timestamp: ${timestamp}`);
      
      // Call the debug endpoint
      const response = await apiRequest<any>(
        '/api/product-requests/debug-admin', 
        'GET', 
        undefined, 
        { _t: timestamp }
      );
      
      console.log('Debug API response received:', response);
      
      if (response) {
        setDebugData(response);
        
        // Handle normal successful response
        if (response.requests) {
          setRequests(response.requests);
          console.log(`Loaded ${response.requests.length} purchase requests`);
        } else {
          console.warn('Response did not contain requests array:', response);
          setRequests([]);
        }
      } else {
        console.error('No response data received from API');
        setError('No data received from server');
      }
    } catch (error: any) {
      console.error('Error fetching debug data:', error);
      
      // Log the full error response for debugging
      if (error.response) {
        console.error('API error response:', error.response.data);
      }
      
      // Set a user-friendly error message
      setError(`Server error (${error.response?.status || 'unknown'}): ${error.response?.data?.message || error.message || 'Unknown error'}`);
      
      // Clear requests on error
      setRequests([]);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Requests Debug</h1>
          <p className="text-gray-500 mt-1">
            Debug view for purchase requests
          </p>
        </div>
        
        <button
          onClick={fetchDebugData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Debug Data
        </button>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading debug data...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-red-800">Error Loading Debug Data</h3>
          <p className="mt-2 text-red-700 max-w-lg mx-auto">{error}</p>
          {debugData && debugData.error && (
            <div className="mt-4 p-4 bg-red-100 rounded-md max-w-lg mx-auto text-left">
              <h4 className="font-medium text-red-800">Server Error Details:</h4>
              <p className="text-red-700 text-sm mt-1">{debugData.message}</p>
              {debugData.stack && (
                <details>
                  <summary className="text-xs text-red-800 mt-2 cursor-pointer">Error Stack</summary>
                  <pre className="text-xs text-red-700 mt-1 overflow-auto p-2 bg-red-50">{debugData.stack}</pre>
                </details>
              )}
            </div>
          )}
          <button 
            onClick={fetchDebugData}
            className="mt-4 px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Debug Info */}
      {!loading && !error && debugData && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Debug Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Admin Email</h3>
              <p className="mt-1 text-gray-900">{debugData.adminEmail || 'N/A'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Admin Organization ID</h3>
              <p className="mt-1 text-gray-900 break-all">{debugData.adminOrganizationId || 'N/A'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Total Requests in System</h3>
              <p className="mt-1 text-gray-900">{debugData.totalRequests !== undefined ? debugData.totalRequests : 'N/A'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Matching Requests for Admin</h3>
              <p className="mt-1 text-gray-900">{debugData.matchingRequests !== undefined ? debugData.matchingRequests : 'N/A'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500">Clients in Organization</h3>
              <p className="mt-1 text-gray-900">{debugData.clientsInOrg !== undefined ? debugData.clientsInOrg : 'N/A'}</p>
            </div>
            
            {debugData.error && (
              <div className="bg-red-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-red-500">Error</h3>
                <p className="mt-1 text-red-700">{debugData.error}: {debugData.message || 'Unknown error'}</p>
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-4">Client IDs in Organization</h3>
          <div className="bg-gray-50 p-4 rounded-md mb-6 overflow-auto">
            <pre className="text-xs text-gray-800">
              {debugData.clientIds && debugData.clientIds.length 
                ? JSON.stringify(debugData.clientIds, null, 2) 
                : 'No clients found'}
            </pre>
          </div>
        </div>
      )}
      
      {/* Requests List */}
      {!loading && !error && requests.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <h2 className="text-lg font-medium text-gray-900 p-4 border-b border-gray-200">
            Purchase Requests ({requests.length})
          </h2>
          
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
                  Client ID
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{request.productName}</div>
                    <div className="text-xs text-gray-500">{request.productId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500">{request.clientId}</div>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <ShoppingBag size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No purchase requests found</h3>
          <p className="mt-1 text-gray-500">
            No purchase requests were found for clients in your organization
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPurchaseRequestsDebugPage; 