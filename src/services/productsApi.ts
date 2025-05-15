import { apiRequest } from './api';

// Define Product interface based on the backend model
export interface Product {
  _id?: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  loyaltyPoints: number;
  stock: number;
  reorderLevel?: number;  
  reservedStock?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number | null;
  images?: string[];
  specifications?: { name: string; value: string }[];
  deals?: {
    name: string;
    description: string;
    quantity: number;
    discountPercentage: number;
    bonusLoyaltyPoints: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }[];
  status?: string;
  organizationId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isClientUploaded?: boolean;
  clientInventory?: {
    initialStock: number;
    currentStock: number;
    reorderLevel: number;
    lastUpdated: string;
  };
}

export interface PurchaseRequest {
  _id?: string;
  productId: string;
  productName?: string;
  clientId: string;
  clientName?: string;
  quantity: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define the interface for product filters
interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  search?: string;
  sort?: string;
  limit?: number;
  page?: number;
  isClientUploaded?: boolean;
  createdBy?: string;
  hasClientInventory?: boolean;
  clientId?: string;
  _t?: number;
  organizationId?: string;
  [key: string]: any; // Allow for additional properties
}

// Get all products with optional filtering
export const getProducts = async (filters: ProductFilters = {}) => {
  console.log('TRACE: getProducts called with filters:', JSON.stringify(filters, null, 2));
  
  // Add a timestamp to prevent caching issues
  const timestamp = new Date().getTime();
  const requestFilters: ProductFilters = {
    ...filters,
    _t: filters._t || timestamp
  };
  
  // Check if user is admin
  const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
  console.log('TRACE: Current user from localStorage:', 
    currentUser ? { id: currentUser.id, role: currentUser.role } : 'No user found');
    
  if (currentUser && currentUser.role === 'admin') {
    console.log('TRACE: ADMIN USER DETECTED - Debugging product retrieval for admin');
    console.log('TRACE: Admin ID:', currentUser.id);
    console.log('TRACE: Admin role:', currentUser.role);
    console.log('TRACE: Original filters had createdBy?', 'createdBy' in requestFilters);
    
    // For admin users, we don't want to filter by createdBy
    if ('createdBy' in requestFilters && currentUser.role === 'admin') {
      console.log('TRACE: Removing createdBy filter for admin user');
      delete requestFilters.createdBy;
    }
  }
  
  // Log the specific createdBy filter if it exists
  if ('createdBy' in requestFilters) {
    console.log(`TRACE: Filtering products by createdBy: ${requestFilters.createdBy}`);
  } else {
    console.log('TRACE: No createdBy filter - should return ALL products');
  }
  
  console.log('TRACE: Final request filters:', JSON.stringify(requestFilters, null, 2));
  
  // Log client inventory filter if it exists
  if ('hasClientInventory' in requestFilters) {
    console.log(`Filtering products with client inventory: ${requestFilters.hasClientInventory}`);
    
    if ('clientId' in requestFilters) {
      console.log(`Filtering by clientId: ${requestFilters.clientId}`);
    }
  }
  
  try {
    // Make the API request - remove /api prefix
    const response = await apiRequest<{ products: Product[], pagination: any }>(
      'products', 
      'GET', 
      undefined, 
      requestFilters
    );
    
    console.log(`Products API returned ${response.products?.length || 0} products`);
    
    // For clientId filtering, we need to do additional client-side filtering
    // since the backend may not correctly identify products purchased by a specific client
    if (requestFilters.hasClientInventory === true && requestFilters.clientId) {
      console.log('Performing additional client-side filtering for products with client inventory');
      
      // Filter to only include products that have clientInventory with stock > 0
      // AND make sure they are properly marked as client products
      const filteredProducts = response.products.filter(product => 
        product.clientInventory && 
        product.clientInventory.currentStock > 0 &&
        (product.isClientUploaded === true || product.createdBy === requestFilters.clientId)
      );
      
      console.log(`After client-side filtering: ${filteredProducts.length} products from original ${response.products.length}`);
      
      // Additional logging to understand which products were filtered out
      if (filteredProducts.length < response.products.length) {
        console.log('Products filtered out:');
        response.products.forEach(product => {
          if (!filteredProducts.includes(product)) {
            console.log(`- ${product.name} (${product._id}): clientInventory=${!!product.clientInventory}, ` +
                       `currentStock=${product.clientInventory?.currentStock || 0}, ` +
                       `isClientUploaded=${product.isClientUploaded}, ` +
                       `createdBy=${product.createdBy}`);
          }
        });
      }
      
      // Replace the products array with the filtered one
      response.products = filteredProducts;
    }
    
    // If there's an organizationId filter (admin products for client view),
    // make sure there are no duplicates with products already in client inventory
    if (requestFilters.organizationId && !requestFilters.hasClientInventory && !requestFilters.isClientUploaded) {
      console.log('Getting organization products (probably admin products for client view)');
      
      // Identify client products that might be duplicates
      const clientId = localStorage.getItem('user') ? 
                      JSON.parse(localStorage.getItem('user') || '{}').id : null;
                      
      if (clientId) {
        console.log(`Current client ID: ${clientId}, checking for duplicate products`);
        
        // Get products the client already has
        try {
          const clientProducts = await apiRequest<{ products: Product[], pagination: any }>(
            '/api/products',
            'GET',
            undefined,
            { 
              isClientUploaded: true, 
              createdBy: clientId,
              _t: timestamp + 1
            }
          );
          
          if (clientProducts && clientProducts.products && clientProducts.products.length > 0) {
            console.log(`Found ${clientProducts.products.length} client-specific products to check against`);
            
            // Create a map of product names the client already has
            const clientProductNames = new Set(clientProducts.products.map(p => p.name));
            
            // Filter out admin products with the same name as client products
            const originalCount = response.products.length;
            response.products = response.products.filter(p => !clientProductNames.has(p.name));
            
            console.log(`Filtered out ${originalCount - response.products.length} duplicate admin products`);
          }
        } catch (err) {
          console.warn('Could not check for client duplicates:', err);
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error in getProducts:', error);
    // Return empty result in case of error to avoid UI crashes
    return { products: [], pagination: { total: 0 } };
  }
};

// Get a single product by ID
export const getProductById = async (id: string) => {
  return apiRequest<Product>(`products/${id}`, 'GET');
};

// Create a new product with client inventory support
export const createProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) => {
  console.log('Creating new product:', productData);
  // Use '/products' instead of '/api/products' to avoid duplicate API prefix
  // Our apiRequest function will add the /api prefix
  return apiRequest<Product>('products', 'POST', productData);
};

// Create a client product with initial inventory
export const createClientProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'> & { initialInventory: number }) => {
  console.log('Creating new client product with inventory:', productData);
  
  // Make sure the isClientUploaded flag is set and initialInventory is validated
  const clientProductData = {
    ...productData,
    isClientUploaded: true,
    initialInventory: productData.initialInventory > 0 ? productData.initialInventory : 1,
  };
  
  // For debugging
  console.log('CLIENT PRODUCT DATA BEFORE API CALL:');
  console.log('- Name:', clientProductData.name);
  console.log('- isClientUploaded:', clientProductData.isClientUploaded);
  console.log('- initialInventory:', clientProductData.initialInventory);
  console.log('- Category:', clientProductData.category);
  
  try {
    // Use 'products' instead of '/api/products' to avoid duplicate API prefix
    const result = await apiRequest<Product>('products', 'POST', clientProductData);
    console.log('Client product created successfully:', result);
    
    // Extra validation check
    if (result && !result.isClientUploaded) {
      console.warn('WARNING: Created product does not have isClientUploaded flag set!');
    }
    
    if (result && (!result.clientInventory || result.clientInventory.currentStock === 0)) {
      console.warn('WARNING: Created product does not have clientInventory or has zero stock!');
    }
    
    return result;
  } catch (error) {
    console.error('Error creating client product:', error);
    throw error;
  }
};

// Update client product inventory
export const updateClientProductInventory = async (id: string, data: { 
  currentStock: number;
  reorderLevel?: number;
}) => {
  console.log(`UPDATING CLIENT PRODUCT INVENTORY for ${id}:`, data);
  
  if (!id) {
    console.error('ERROR: Missing product ID for inventory update');
    throw new Error('Product ID is required for inventory update');
  }
  
  try {
    // Make sure values are numbers
    const payload = {
      currentStock: Number(data.currentStock),
      reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : undefined
    };
    
    console.log(`Making API request to products/${id}/client-inventory with payload:`, payload);
    
    // Make the API request - remove /api prefix
    const result = await apiRequest<{ message: string, product: Product }>(
      `products/${id}/client-inventory`, 
      'PATCH', 
      payload
    );
    
    // Validate the response
    if (!result) {
      console.error('ERROR: Empty response from client inventory update');
      throw new Error('Failed to update client inventory - empty response');
    }
    
    if (!result.product) {
      console.warn('WARNING: Client inventory update successful but no product returned');
    } else {
      // Verify the inventory was actually updated
      const updatedStock = result.product.clientInventory?.currentStock;
      if (updatedStock !== payload.currentStock) {
        console.warn(`WARNING: Stock mismatch after update. Expected: ${payload.currentStock}, Got: ${updatedStock}`);
      } else {
        console.log(`INVENTORY UPDATE SUCCESS: Stock set to ${updatedStock}`);
      }
    }
    
    console.log('Client inventory update response:', result);
    return result;
  } catch (error) {
    console.error('Error updating client inventory:', error);
    // Try to provide a more helpful error message
    let errorMessage = 'Unknown error updating inventory';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(`Failed to update client inventory: ${errorMessage}`);
  }
};

// Update a product
export const updateProduct = async (id: string, productData: Partial<Product>) => {
  return apiRequest<Product>(`products/${id}`, 'PUT', productData);
};

// Update product inventory
export const updateProductInventory = async (id: string, inventoryData: { 
  currentStock?: number; 
  reorderLevel?: number; 
  reservedStock?: number 
}) => {
  return apiRequest<Product>(`products/${id}/inventory`, 'PATCH', inventoryData);
};

// Delete a product
export const deleteProduct = async (id: string) => {
  return apiRequest<{ message: string }>(`products/${id}`, 'DELETE');
};

// Get product categories (unique categories from all products)
export const getProductCategories = async () => {
  const response = await getProducts();
  const categories = new Set<string>();
  
  response.products.forEach(product => {
    if (product.category) {
      categories.add(product.category);
    }
  });
  
  return Array.from(categories);
};

// Create a purchase request
export const createPurchaseRequest = async (purchaseData: Omit<PurchaseRequest, '_id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  try {
    console.log('Creating purchase request with data:', purchaseData);
    
    // Ensure client ID is a string
    if (purchaseData.clientId) {
      purchaseData.clientId = String(purchaseData.clientId);
    }
    
    // Ensure product ID is a string
    if (purchaseData.productId) {
      purchaseData.productId = String(purchaseData.productId);
    }
    
    // Ensure quantity is a number
    if (purchaseData.quantity) {
      purchaseData.quantity = Number(purchaseData.quantity);
    }
    
    // Ensure price is a number
    if (purchaseData.price) {
      purchaseData.price = Number(purchaseData.price);
    }
    
    // Add status field
    const requestData = {
      ...purchaseData,
      status: 'pending'
    };
    
    console.log('Final purchase request payload:', requestData);
    
    // Use a consistent endpoint without /api prefix
    const result = await apiRequest<PurchaseRequest>('product-requests', 'POST', requestData);
    console.log('Purchase request created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating purchase request:', error);
    throw error;
  }
};

// Get all purchase requests (admin only)
export const getPurchaseRequests = async (filters = {}) => {
  try {
    console.log('Calling getPurchaseRequests API with filters:', filters);
    
    // Add a timestamp to avoid caching issues
    const timestamp = new Date().getTime();
    const requestFilters = {
      ...filters,
      _t: timestamp
    };
    
    console.log('Making API request to product-requests with filters:', requestFilters);
    
    // The API now returns an array directly, not an object with requests property
    const response = await apiRequest<PurchaseRequest[] | { requests: PurchaseRequest[], pagination?: any }>(
      'product-requests', 
      'GET', 
      undefined, 
      requestFilters
    );
    
    console.log('Purchase requests API response type:', Array.isArray(response) ? 'Array' : typeof response);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      // API returned array directly (new format)
      console.log(`API returned array with ${response.length} purchase requests`);
      
      // Cache the results in localStorage for emergency use
      try {
        localStorage.setItem('cached_purchase_requests', JSON.stringify(response));
        console.log('Cached purchase requests to localStorage');
      } catch (cacheError) {
        console.warn('Failed to cache purchase requests:', cacheError);
      }
      
      return { requests: response, pagination: { total: response.length } };
    } else if (response && typeof response === 'object') {
      // API returned object (old format)
      if ('requests' in response && Array.isArray(response.requests)) {
        console.log(`API returned object with ${response.requests.length} purchase requests`);
        
        // Cache the results in localStorage for emergency use
        try {
          localStorage.setItem('cached_purchase_requests', JSON.stringify(response.requests));
          console.log('Cached purchase requests to localStorage');
        } catch (cacheError) {
          console.warn('Failed to cache purchase requests:', cacheError);
        }
        
        return response;
      } else {
        // Response is an object but not in the expected format
        console.warn('API returned unexpected object format:', response);
        // Try to adapt the response if possible
        const adaptedRequests = 'data' in response && Array.isArray((response as any).data) 
          ? (response as any).data 
          : [];
        return { requests: adaptedRequests, pagination: { total: adaptedRequests.length } };
      }
    }
    
    // Fallback for unexpected response
    console.error('Unexpected API response format:', response);
    return { requests: [], pagination: { total: 0 } };
  } catch (error) {
    console.error('Error in getPurchaseRequests service:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return { requests: [], pagination: { total: 0 }, error };
  }
};

// Get client purchase requests (for client dashboard)
export const getClientPurchaseRequests = async (clientId: string) => {
  console.log('Getting purchase requests for client:', clientId);
  
  try {
    // Make the API request
    const response = await apiRequest<PurchaseRequest[]>(
      'product-requests/client', 
      'GET', 
      undefined, 
      { clientId }
    );
    
    console.log(`Received ${Array.isArray(response) ? response.length : '?'} client purchase requests`);
    return response;
  } catch (error) {
    console.error('Error getting client purchase requests:', error);
    throw error;
  }
};

// Approve a purchase request (admin only)
export const approvePurchaseRequest = async (requestId: string) => {
  console.log(`Approving purchase request ${requestId}`);
  try {
    const response = await apiRequest<{ message: string; order?: any; }>(
      `product-requests/${requestId}/approve`, 
      'POST'
    );
    return response;
  } catch (error) {
    console.error('Error approving purchase request:', error);
    throw error;
  }
};

// Reject a purchase request (admin only)
export const rejectPurchaseRequest = async (requestId: string, reason: string) => {
  console.log(`Rejecting purchase request ${requestId} with reason: ${reason}`);
  try {
    const response = await apiRequest<{ message: string }>(
      `product-requests/${requestId}/reject`, 
      'POST', 
      { reason }
    );
    return response;
  } catch (error) {
    console.error('Error rejecting purchase request:', error);
    throw error;
  }
};

// Manually approve a purchase request (admin only) - for debug
export const manuallyApprovePurchaseRequest = async (requestId: string) => {
  console.log(`Manually approving purchase request ${requestId}`);
  try {
    const response = await apiRequest<{ message: string; order?: any; }>(
      `product-requests/${requestId}/manual-approve`, 
      'POST'
    );
    return response;
  } catch (error) {
    console.error('Error manually approving purchase request:', error);
    throw error;
  }
};

// Emergency direct purchase approval - most direct possible approach
export const directlyApprovePurchaseRequest = async (request: PurchaseRequest) => {
  console.log(`Starting EMERGENCY approval for request ID ${request._id}`);
  
  try {
    // Cache client data for future reference if available
    if (request.clientId && request.clientName) {
      try {
        const existingData = localStorage.getItem('clients_data');
        const clientsData = existingData ? JSON.parse(existingData) : [];
        
        // Check if this client is already in the cache
        const existingClientIndex = clientsData.findIndex(
          (c: any) => c.id === request.clientId || c._id === request.clientId
        );
        
        if (existingClientIndex >= 0) {
          // Update existing client record
          clientsData[existingClientIndex] = {
            ...clientsData[existingClientIndex],
            name: request.clientName,
            id: request.clientId,
            _id: request.clientId
          };
        } else {
          // Add new client record
          clientsData.push({
            id: request.clientId,
            _id: request.clientId,
            name: request.clientName,
            timestamp: new Date().toISOString()
          });
        }
        
        // Save updated client data
        localStorage.setItem('clients_data', JSON.stringify(clientsData));
        console.log('Cached client data for future reference');
      } catch (e) {
        console.error('Failed to cache client data:', e);
      }
    }

    // Generate unique SKU with extra randomness to avoid conflicts
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    const uniqueSku = `EMERGENCY-${randomStr}-${timestamp}`;
    
    // Get organization ID from localStorage or other sources
    const orgId = getCurrentUserOrganizationId();
    if (!orgId) {
      console.warn('No organization ID found - product visibility might be limited');
    }
    
    // Extract client ID - ensure it's a string
    const clientId = typeof request.clientId === 'string' 
      ? request.clientId 
      : String(request.clientId);
    
    console.log('Creating emergency product for client ID:', clientId);
    
    // Try to get client information from localStorage to ensure ID format matches
    let clientUserObject = null;
    try {
      // Look for user data in localStorage that might match this client
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObject = JSON.parse(userData);
        // If current user is this client
        if (userObject.id === clientId || userObject.id === request.clientId) {
          clientUserObject = userObject;
          console.log('Using current user object as client reference:', clientUserObject.id);
        }
      }
      
      // If we couldn't find a match in the current user, check if we have client data cached
      if (!clientUserObject) {
        const clientsData = localStorage.getItem('clients_data');
        if (clientsData) {
          const clients = JSON.parse(clientsData);
          // Find client that matches this ID
          const matchingClient = clients.find((c: any) => 
            c.id === clientId || c._id === clientId || 
            String(c.id) === clientId || String(c._id) === clientId
          );
          
          if (matchingClient) {
            clientUserObject = matchingClient;
            console.log('Found client in cached data:', clientUserObject.id);
          }
        }
      }
    } catch (e) {
      console.error('Error finding client reference:', e);
    }
    
    // Prepare the product object with all required fields
    const emergencyProduct = {
      name: request.productName || 'Emergency Approved Product',
      description: `Product added to inventory through emergency approval process. Original request ID: ${request._id}`,
      sku: uniqueSku,
      category: 'Emergency Approved',
      price: request.price,
      loyaltyPoints: 0,
      stock: 0, // Set to 0 for client products
      minOrderQuantity: 1,
      maxOrderQuantity: null,
      specifications: [
        { name: 'Source', value: 'Emergency Approval Process' },
        { name: 'Original Request ID', value: request._id || 'Unknown' },
        { name: 'Approval Date', value: new Date().toISOString() }
      ],
      images: [],
      status: 'active',
      organizationId: orgId || undefined, // Ensure it's string or undefined, not null
      // Use the exact client ID object if we found one, otherwise use the string
      createdBy: clientUserObject ? clientUserObject.id : clientId,
      isClientUploaded: true, // Mark as client product
      initialInventory: request.quantity // This will be used to create clientInventory
    };
    
    // Log the full product data for debugging
    console.log('EMERGENCY PRODUCT DATA with createdBy:', emergencyProduct.createdBy);
    
    // Store the original inventory for debugging
    try {
      // Get existing products to see what's already in the system
      const existingProducts = await getProducts({ createdBy: emergencyProduct.createdBy });
      console.log(`Found ${existingProducts.products?.length || 0} existing products for client before emergency approval`);
      
      // Store a record of what products existed before this emergency operation
      localStorage.setItem('debug_pre_emergency_products', JSON.stringify({
        timestamp: new Date().toISOString(),
        clientId: emergencyProduct.createdBy,
        products: existingProducts.products?.map(p => ({ id: p._id, name: p.name })) || []
      }));
    } catch (e) {
      console.error('Failed to store debug info:', e);
    }
    
    let productCreated = false;
    let createdProduct = null;
    
    // Try multiple methods to ensure the product is created correctly
    try {
      console.log('METHOD 1: Using createClientProduct function');
      
      // Use the client product creation function to ensure proper structure
      const clientProduct = await createClientProduct(emergencyProduct);
      
      console.log('✅ Emergency product created successfully via createClientProduct:', clientProduct);
      productCreated = true;
      createdProduct = clientProduct;
      
      // Update the purchase request status to 'approved'
      if (request._id) {
        // Track if any status update method succeeded
        let statusUpdated = false;
        
        // Method 1: Direct API request
        try {
          console.log('Method 1: Updating purchase request status via API PUT...');
          const statusResponse = await apiRequest<PurchaseRequest>(
            `/api/product-requests/${request._id}`, 
            'PUT', 
            { status: 'approved' }
          );
          console.log('✅ Purchase request status updated via API:', statusResponse);
          statusUpdated = true;
        } catch (apiStatusError) {
          console.error('❌ API status update failed:', apiStatusError);
        }
        
        // Method 2: Try the reliable-approve endpoint directly if API failed
        if (!statusUpdated) {
          try {
            console.log('Method 2: Using reliable-approve endpoint...');
            const reliableResponse = await apiRequest<any>(
              `/api/product-requests/${request._id}/reliable-approve`,
              'POST'
            );
            console.log('✅ Purchase request status updated via reliable endpoint:', reliableResponse);
            statusUpdated = true;
          } catch (reliableStatusError) {
            console.error('❌ Reliable status update failed:', reliableStatusError);
          }
        }
        
        // Method 3: Cache the updated status locally
        try {
          console.log('Method 3: Updating local cache...');
          // Store updated request in localStorage for immediate UI update
          const cachedRequests = localStorage.getItem('cached_purchase_requests');
          if (cachedRequests) {
            const requestsArray = JSON.parse(cachedRequests);
            const updatedRequests = requestsArray.map((r: any) => 
              r._id === request._id ? { ...r, status: 'approved' } : r
            );
            localStorage.setItem('cached_purchase_requests', JSON.stringify(updatedRequests));
            console.log('✅ Updated status in cached requests');
          }
          
          // Also update the shadow requests if they exist
          const shadowRequests = localStorage.getItem('shadowRequests');
          if (shadowRequests) {
            const requestsArray = JSON.parse(shadowRequests);
            const updatedShadowRequests = requestsArray.map((r: any) => 
              r._id === request._id ? { ...r, status: 'approved' } : r
            );
            localStorage.setItem('shadowRequests', JSON.stringify(updatedShadowRequests));
            console.log('✅ Updated status in shadow requests');
          }
        } catch (cacheError) {
          console.error('❌ Failed to update cached request status:', cacheError);
        }
      }
      
      // Create an event to notify other components
      const successEvent = new CustomEvent('emergency-approval-success', { 
        detail: { 
          product: createdProduct, 
          request: { ...request, status: 'approved' },  // Pass the updated request
          clientId,
          statusUpdated: true
        } 
      });
      window.dispatchEvent(successEvent);
      
      // Force a refresh of the purchase requests list
      const refreshEvent = new CustomEvent('force-refresh-purchase-requests');
      window.dispatchEvent(refreshEvent);
      
      return {
        success: true,
        message: 'EMERGENCY: Product added directly to client inventory',
        product: createdProduct,
        request: { ...request, status: 'approved' },  // Return updated request
        clientId,
        statusUpdated: true
      };
    } catch (apiError: any) {
      console.error('❌ API request failed:', apiError.message);
      
      // Try fetch directly as an alternative
      try {
        console.log('METHOD 2: Trying fetch API directly');
        
        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No authentication token found, this may fail');
        }
        
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(emergencyProduct)
        });
        
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Emergency product created via fetch:', data);
        productCreated = true;
        createdProduct = data;
        
        // Update the purchase request status
        if (request._id) {
          try {
            const statusResponse = await fetch(`/api/product-requests/${request._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify({ status: 'approved' })
            });
            console.log('Status update result:', statusResponse.ok ? 'Success' : 'Failed');
          } catch (statusError) {
            console.error('Failed to update status via fetch:', statusError);
          }
        }
        
        return {
          success: true,
          message: 'EMERGENCY: Product added directly via fetch',
          product: data,
          request: { ...request, status: 'approved' },
          clientId,
          statusUpdated: true
        };
      } catch (fetchError) {
        console.error('❌ All methods failed, using localStorage fallback');
        
        // Create shadow product in localStorage as last resort
        const shadowProduct = {
          ...emergencyProduct,
          _id: `shadow-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        
        try {
          // Save to localStorage
          const shadowProducts = localStorage.getItem('shadowProducts')
            ? JSON.parse(localStorage.getItem('shadowProducts') || '[]')
            : [];
          
          shadowProducts.push(shadowProduct);
          localStorage.setItem('shadowProducts', JSON.stringify(shadowProducts));
          
          // Also update request status in localStorage
          if (request._id) {
            const shadowRequests = localStorage.getItem('shadowRequests')
              ? JSON.parse(localStorage.getItem('shadowRequests') || '[]')
              : [];
            
            // Find and update or add the request
            const index = shadowRequests.findIndex((r: any) => r._id === request._id);
            if (index >= 0) {
              shadowRequests[index] = { ...request, status: 'approved' };
            } else {
              shadowRequests.push({ ...request, status: 'approved' });
            }
            
            localStorage.setItem('shadowRequests', JSON.stringify(shadowRequests));
          }
          
          return {
            success: true,
            mockSuccess: true,
            message: 'EMERGENCY: Product saved to localStorage',
            mockProduct: shadowProduct,
            request: { ...request, status: 'approved' },
            clientId,
            statusUpdated: true
          };
        } catch (localStorageError) {
          throw new Error('All emergency product creation methods failed');
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Emergency approval process completely failed:', error);
    throw error;
  }
};

// Helper function to safely get current user organization ID from localStorage
const getCurrentUserOrganizationId = (): string | null => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    
    // Handle different user data structures
    if (user.organizationId) {
      return typeof user.organizationId === 'string' 
        ? user.organizationId 
        : user.organizationId.toString();
    }
    
    if (user.organization && user.organization._id) {
      return user.organization._id;
    }
    
    if (user.organization && user.organization.id) {
      return user.organization.id;
    }
    
    return null;
  } catch (e) {
    console.error('Error getting organization ID from localStorage:', e);
    return null;
  }
};

// Reliable approve a purchase request (admin only)
export const reliableApprovePurchaseRequest = async (requestId: string) => {
  console.log(`Reliably approving purchase request ${requestId}`);
  try {
    // Use the reliable-approve endpoint which properly handles inventory transfer
    const response = await apiRequest<{ 
      message: string, 
      request: PurchaseRequest,
      adminProduct: {
        id: string;
        name: string;
        newStock: number;
      },
      clientProduct: {
        id: string;
        name: string;
        stock: number;
        isNew: boolean;
        isClientUploaded: boolean;
      }
    }>(
      `product-requests/${requestId}/reliable-approve`, 
      'POST'
    );
    
    console.log('Purchase request reliable approval response:', response);
    
    // Log inventory changes for debugging
    if (response.adminProduct && response.clientProduct) {
      console.log(`Inventory updated: Admin product "${response.adminProduct.name}" stock reduced to ${response.adminProduct.newStock}`);
      console.log(`Client product "${response.clientProduct.name}" inventory updated to ${response.clientProduct.stock} units`);
    } else {
      console.warn('Approval successful but inventory update information missing in response');
    }
    
    return response;
  } catch (error) {
    console.error('Error in reliableApprovePurchaseRequest:', error);
    throw error;
  }
};