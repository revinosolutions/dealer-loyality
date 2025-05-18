import { apiRequest } from './api';

// Define types
export interface PurchaseRequest {
  _id?: string;
  productId: string | any; // Can be a string ID or populated product object
  productName?: string;
  clientId: string | any; // Can be a string ID or populated client object
  clientName?: string;
  quantity: number;
  price: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  product?: {
    name: string;
    sku: string;
    description?: string;
    price: number;
    images?: string[];
    category?: string;
  };
  client?: {
    name: string;
    email: string;
    company?: string;
  };
}

export interface PurchaseRequestFilters {
  status?: string;
  clientId?: string;
  organizationId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  limit?: number;
  page?: number;
  [key: string]: any;  // Allow additional filter properties
}

// Create a new purchase request
export const createPurchaseRequest = async (requestData: Omit<PurchaseRequest, '_id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  console.log('Creating purchase request:', requestData);
  
  // Validate required fields
  if (!requestData.productId) throw new Error('Product ID is required');
  if (!requestData.clientId) throw new Error('Client ID is required');
  if (!requestData.quantity || requestData.quantity <= 0) throw new Error('Valid quantity is required');
  if (!requestData.price || requestData.price <= 0) throw new Error('Valid price is required');
  
  // Add organization ID if missing - important for proper filtering in admin view
  if (!requestData.organizationId && localStorage.getItem('user')) {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.organization?.id) {
        requestData.organizationId = userData.organization.id;
      }
    } catch (e) {
      console.warn('Could not parse user data from localStorage', e);
    }
  }
  
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Try multiple endpoints sequentially
    const endpointsToTry = [
      'products/purchase-requests',
      'purchase-requests',
      'client-requests/purchase-requests',
      '/api/purchase-requests'
    ];
    
    let lastError = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Attempting to create purchase request using endpoint: ${endpoint}`);
        const response = await apiRequest<PurchaseRequest>(
          endpoint, 
          'POST', 
          requestData,
          { _t: timestamp }
        );
        console.log(`Successfully created purchase request using endpoint: ${endpoint}`, response);
        return response;
      } catch (error: any) {
        console.warn(`Failed to create purchase request using endpoint ${endpoint}:`, error.message);
        lastError = error;
        // Continue to next endpoint
      }
    }
    
    // If we reach here, all endpoints failed
    console.error('All purchase request endpoints failed');
    
    // Try one more direct approach as last resort
    try {
      console.log('Attempting direct fetch as last resort');
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/products/purchase-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct fetch succeeded:', data);
        return data;
      } else {
        throw new Error(`Direct fetch failed with status: ${response.status}`);
      }
    } catch (directFetchError) {
      console.error('Direct fetch also failed:', directFetchError);
    }
    
    // If we reach here, throw the last error
    throw lastError || new Error('Failed to create purchase request after trying all endpoints');
  } catch (error: any) {
    console.error('Error creating purchase request:', error);
    // Enhance error message with details if available
    if (error.response?.data?.message) {
      throw new Error(`Failed to create purchase request: ${error.response.data.message}`);
    }
    throw error;
  }
};

// Get purchase requests with optional filtering
export const getPurchaseRequests = async (filters: PurchaseRequestFilters = {}, token?: string) => {
  console.log('Fetching purchase requests with filters:', filters);
  
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const requestFilters = {
      ...filters,
      _t: filters._t || timestamp
    };
    
    // Try multiple endpoints sequentially
    const endpointsToTry = [
      'products/purchase-requests',
      'purchase-requests',
      'admin/purchase-requests',
      'client-purchase-requests'
    ];
    
    let response = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Attempting to fetch purchase requests using endpoint: ${endpoint}`);
        
        // Set up custom headers with the token if provided
        let customConfig = undefined;
        if (token) {
          // Use custom config with longer timeout for token-specific requests
          customConfig = 30000; // 30 seconds timeout
        }
        
        const result = await apiRequest<any>(
          endpoint,
          'GET',
          undefined,
          requestFilters,
          customConfig
        );
        
        console.log(`Successfully fetched purchase requests using endpoint: ${endpoint}`);
        console.log('Raw API result structure:', JSON.stringify(result).substring(0, 300) + '...');
        
        // Handle various response formats from the server
        // Case 1: API returned the requests array directly
        if (Array.isArray(result)) {
          console.log('Response is a direct array of requests');
          response = { 
            requests: result, 
            pagination: { total: result.length } 
          };
          break;
        } 
        // Case 2: API returned an object with a requests property
        else if (result && Array.isArray(result.requests)) {
          console.log('Response contains requests array in result.requests');
          response = result;
          break;
        }
        // Case 3: The response itself is a single request (direct array access)
        else if (result && typeof result === 'object' && result._id) {
          console.log('Response appears to be a single request object');
          response = { 
            requests: [result], 
            pagination: { total: 1 } 
          };
          break;
        }
        // Case 4: API directly returned the requests (not in a 'requests' property)
        else if (result) {
          // Try to find if any property contains an array of requests
          console.log('Looking for requests array in response properties');
          for (const key in result) {
            if (Array.isArray(result[key])) {
              console.log(`Found array in result.${key}, treating as requests`);
              response = { 
                requests: result[key], 
                pagination: { total: result[key].length } 
              };
              break;
            }
          }
          
          if (response) break;
        }
      } catch (error: any) {
        console.warn(`Failed to fetch purchase requests using endpoint ${endpoint}:`, error.message);
        // Continue to next endpoint
      }
    }
    
    // If we still don't have a response, try direct fetch
    if (!response) {
      try {
        console.log('Attempting direct fetch for purchase requests');
        const token = localStorage.getItem('token');
        
        const directResponse = await fetch('/api/products/purchase-requests?' + new URLSearchParams(requestFilters as any), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log('Direct fetch succeeded:', data);
          
          if (Array.isArray(data)) {
            response = { 
              requests: data, 
              pagination: { total: data.length } 
            };
          } else if (data.requests && Array.isArray(data.requests)) {
            response = data;
          } else {
            // Try to extract requests array from response
            for (const key in data) {
              if (Array.isArray(data[key])) {
                response = { 
                  requests: data[key], 
                  pagination: { total: data[key].length } 
                };
                break;
              }
            }
          }
        }
      } catch (directError) {
        console.error('Direct fetch also failed:', directError);
      }
    }
    
    // If we found a response, process it
    if (response) {
      console.log(`Retrieved ${response.requests?.length || 0} purchase requests`);
      
      // Check the first request to better understand the structure
      if (response.requests && response.requests.length > 0) {
        const firstRequest = response.requests[0];
        console.log('Example request structure:', {
          id: firstRequest._id,
          productId: firstRequest.productId,
          clientId: firstRequest.clientId,
          // Check if we have object references or string IDs
          productIdType: typeof firstRequest.productId,
          clientIdType: typeof firstRequest.clientId,
          // Check if productId is populated
          hasPopulatedProduct: firstRequest.productId && 
                               typeof firstRequest.productId === 'object' && 
                               (firstRequest.productId as any).name !== undefined,
          // Check if clientId is populated
          hasPopulatedClient: firstRequest.clientId && 
                              typeof firstRequest.clientId === 'object' && 
                              (firstRequest.clientId as any).name !== undefined,
        });
      }
      
      // Ensure we handle both populated objects and direct properties
      if (Array.isArray(response.requests)) {
        response.requests = response.requests.map((request: any) => {
          // Create a new request object to ensure we have all properties
          const processedRequest: PurchaseRequest = {
            ...request,
            status: request.status || 'pending',
            quantity: request.quantity || 0,
            price: request.price || 0
          };
          
          // Make sure the product data is available
          if (!processedRequest.product) {
            processedRequest.product = {
              name: 'Unknown Product',
              sku: 'N/A',
              price: request.price || 0
            };
              
            // First, check if productId is a populated object
            if (request.productId && typeof request.productId === 'object') {
              // productId is populated, extract the needed fields
              const populatedProduct = request.productId;
              processedRequest.product = {
                name: populatedProduct.name || 'Unknown Product',
                sku: populatedProduct.sku || 'N/A',
                price: populatedProduct.price || request.price || 0,
                images: populatedProduct.images || [],
                category: populatedProduct.category || ''
              };
              
              // Also save the name to productName for compatibility
              if (populatedProduct.name) {
                processedRequest.productName = populatedProduct.name;
              }
            } 
            // Then check for direct productName property
            else if (request.productName) {
              processedRequest.product = {
                name: request.productName,
                sku: request.productId || 'N/A',
                price: request.price || 0
              };
            }
            // Fallback is already set above
          }
          
          // Make sure the client data is available
          if (!processedRequest.client) {
            processedRequest.client = {
              name: 'Unknown Client',
              email: 'N/A'
            };
            
            // First, check if clientId is a populated object
            if (request.clientId && typeof request.clientId === 'object') {
              // clientId is populated, extract the needed fields
              const populatedClient = request.clientId;
              processedRequest.client = {
                name: populatedClient.name || 'Unknown Client',
                email: populatedClient.email || 'N/A',
                company: populatedClient.company || ''
              };
              
              // Also save the name to clientName for compatibility
              if (populatedClient.name) {
                processedRequest.clientName = populatedClient.name;
              }
            }
            // Then check for direct clientName property
            else if (request.clientName) {
              processedRequest.client = {
                name: request.clientName,
                email: request.clientId || 'N/A'
              };
            }
            // Fallback is already set above
          }
          
          return processedRequest;
        });
      }
      
      return response;
    }
    
    // Return empty array if all attempts failed
    console.error('All attempts to fetch purchase requests failed');
    return { requests: [], pagination: { total: 0 } };
  } catch (error: any) {
    console.error('Error fetching purchase requests:', error);
    // Return empty array to prevent UI crashes
    return { requests: [], pagination: { total: 0 } };
  }
};

// Get a single purchase request by ID
export const getPurchaseRequestById = async (id: string) => {
  console.log(`Fetching purchase request ${id}`);
  
  try {
    const response = await apiRequest<PurchaseRequest>(
      `products/purchase-requests/${id}`,
      'GET'
    );
    return response;
  } catch (error: any) {
    console.error(`Error fetching purchase request ${id}:`, error);
    throw error;
  }
};

// Update a purchase request's status
export const updatePurchaseRequestStatus = async (
  id: string, 
  status: 'approved' | 'rejected' | 'completed',
  notes?: string
) => {
  console.log(`Updating purchase request ${id} status to ${status}`);
  
  try {
    const data: any = { status };
    if (notes) {
      if (status === 'rejected') {
        data.rejectionReason = notes;
      } else {
        data.notes = notes;
      }
    }
    
    const response = await apiRequest<PurchaseRequest>(
      `products/purchase-requests/${id}/status`,
      'PATCH',
      data
    );
    return response;
  } catch (error: any) {
    console.error(`Error updating purchase request ${id}:`, error);
    throw error;
  }
};

// Delete a purchase request (admin only)
export const deletePurchaseRequest = async (id: string) => {
  console.log(`Deleting purchase request ${id}`);
  
  try {
    const response = await apiRequest<{ success: boolean }>(
      `products/purchase-requests/${id}`,
      'DELETE'
    );
    return response;
  } catch (error: any) {
    console.error(`Error deleting purchase request ${id}:`, error);
    throw error;
  }
};

// Get purchase request statistics (admin only)
export const getPurchaseRequestStats = async (organizationId?: string) => {
  console.log('Fetching purchase request statistics');
  
  try {
    const filters: any = {};
    if (organizationId) {
      filters.organizationId = organizationId;
    }
    
    const response = await apiRequest<{
      pending: number;
      approved: number;
      rejected: number;
      completed: number;
      total: number;
    }>(
      'products/purchase-requests/stats',
      'GET',
      undefined,
      filters
    );
    return response;
  } catch (error: any) {
    console.error('Error fetching purchase request statistics:', error);
    // Return default stats to prevent UI crashes
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      total: 0
    };
  }
}; 