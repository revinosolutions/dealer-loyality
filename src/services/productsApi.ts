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
  adminView?: boolean;
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
    currentUser ? { id: currentUser.id, role: currentUser.role, organizationId: currentUser.organizationId } : 'No user found');
    
  if (currentUser?.role === 'client') {
    // For client users, we want to show both admin products and their own products
    console.log('TRACE: Client user detected, setting up client-specific filters');
    
    // Always include the client ID for filtering
    requestFilters.clientId = currentUser.id;
    
    // Don't restrict to only client inventory - show all products
    delete requestFilters.hasClientInventory;
    
    // Don't restrict to only client uploaded - show all products
    delete requestFilters.isClientUploaded;
  }
  
  // Add query string parameters
  const queryParams = new URLSearchParams();
  Object.entries(requestFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  // Add a debug flag
  queryParams.append('debug', 'true');
  
  // Make the request
  console.log(`TRACE: Fetching products with URL: /api/products?${queryParams.toString()}`);
  
  try {
    const response = await fetch(`/api/products?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-User-ID': currentUser?.id || '',
        'X-User-Role': currentUser?.role || '',
        'X-Client-ID': currentUser?.role === 'client' ? currentUser.id : ''
      }
    });
    
    if (!response.ok) {
      console.error(`TRACE: Error response from API: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        // Try to refresh the token
        console.log('TRACE: Unauthorized, attempting to refresh token');
        // Call your token refresh logic here if needed
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`TRACE: API returned ${data.products?.length || 0} products`);
    
    // Sample the first product for debugging
    if (data.products && data.products.length > 0) {
      const sample = data.products[0];
      console.log('TRACE: Sample product data:', {
        id: sample._id,
        name: sample.name,
        stock: sample.stock,
        hasClientInventory: !!sample.clientInventory,
        clientStock: sample.clientInventory?.currentStock,
        createdBy: sample.createdBy,
        isClientUploaded: sample.isClientUploaded
      });
    } else {
      console.log('TRACE: No products returned');
    }
    
    return data;
  } catch (error) {
    console.error('TRACE: Error fetching products:', error);
    throw error;
  }
};

// Get a single product by ID
export const getProductById = async (id: string) => {
  try {
    try {
      // Try standard endpoint first
      return await apiRequest<Product>(`products/${id}`, 'GET');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Product endpoint for ID ${id} not found (404), trying alternative endpoint...`);
        
        // Try with explicit /api/products path
        try {
          return await apiRequest<Product>(`/api/products/${id}`, 'GET');
        } catch (fallbackError) {
          console.error('Fallback product endpoint also failed:', fallbackError);
          
          // Last attempt with direct fetch
          try {
            const directResponse = await fetch(`/api/products/${id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (directResponse.ok) {
              const directData = await directResponse.json();
              return directData;
            }
          } catch (directError) {
            console.error('All product endpoint attempts failed:', directError);
          }
          
          // If we reach here, rethrow the original error
          throw error;
        }
      }
      
      // If not a 404, rethrow the original error
      throw error;
    }
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    throw error;
  }
};

// Create a new product with client inventory support
export const createProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) => {
  console.log('Creating new product:', productData);
  return apiRequest<Product>('products', 'POST', productData);
};

// Create a new client product (with client inventory tracking)
export const createClientProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'> & { initialInventory: number }) => {
  console.log('Creating new client product with inventory:', productData);
  
  // Set isClientUploaded to true
  const clientProductData = {
    ...productData,
    isClientUploaded: true
  };
  
  // Create the product
  return apiRequest<Product>('products/client-product', 'POST', clientProductData);
};

// Update client product inventory
export const updateClientProductInventory = async (id: string, data: { 
  currentStock: number;
  reorderLevel?: number;
}) => {
  console.log(`Updating client product ${id} inventory:`, data);
  return apiRequest<Product>(`products/${id}/client-inventory`, 'PATCH', data);
};

// Update a product
export const updateProduct = async (id: string, productData: Partial<Product>) => {
  return apiRequest<Product>(`products/${id}`, 'PATCH', productData);
};

// Update a product's inventory specifically
export const updateProductInventory = async (id: string, inventoryData: { 
  currentStock?: number; 
  reorderLevel?: number; 
  reservedStock?: number 
}) => {
  console.log(`Updating product ${id} inventory:`, inventoryData);
  
  // Map currentStock to stock to match the server-side parameter name
  const serverData = {
    stock: inventoryData.currentStock,
    reorderLevel: inventoryData.reorderLevel,
    reservedStock: inventoryData.reservedStock
  };
  
  console.log(`Mapped to server parameters:`, serverData);
  return apiRequest<Product>(`products/${id}/inventory`, 'PATCH', serverData);
};

// Delete a product
export const deleteProduct = async (id: string) => {
  return apiRequest<{ success: boolean }>(`products/${id}`, 'DELETE');
};

// Get all product categories
export const getProductCategories = async () => {
  try {
    const response = await apiRequest<string[]>('products/categories', 'GET');
    return response || [];
  } catch (error) {
    console.error('Error getting product categories:', error);
    return [];
  }
};

// Helper function to get current user's organization ID
const getCurrentUserOrganizationId = (): string | null => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    return user?.organization?.id || user?.organizationId || null;
  } catch (error) {
    console.error('Error getting organization ID:', error);
    return null;
  }
};

// Add stub implementation for purchase requests (removed functionality)
export const createPurchaseRequest = async (requestData: any) => {
  console.warn('Purchase request functionality has been removed from the API');
  console.log('Request data that would have been sent:', requestData);
  
  // Return a mock successful response after a slight delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        _id: 'mock-request-' + Date.now(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...requestData
      });
    }, 500);
  });
};

// PurchaseRequest interface for use in the functions
export interface PurchaseRequest {
  _id?: string;
  productId: string | any; // Can be a string ID or populated product object
  productName?: string;
  clientId: string | any; // Can be a string ID or populated client object
  clientName?: string;
  quantity: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  product?: Product;
  client?: {
    name: string;
    email: string;
    company?: string;
  };
}

// Function to get purchase requests
export const getPurchaseRequests = async (filters: any = {}) => {
  console.log('Fetching purchase requests with filters:', filters);
  
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const requestFilters = {
      ...filters,
      _t: filters._t || timestamp
    };
    
    const response = await apiRequest<{ requests: PurchaseRequest[], pagination: any }>(
      'products/purchase-requests',
      'GET',
      undefined,
      requestFilters
    );
    
    return response;
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    throw error;
  }
};

// Function to get client purchase requests
export const getClientPurchaseRequests = async (filters: any = {}) => {
  console.log('Fetching client purchase requests with filters:', filters);
  
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const requestFilters = {
      ...filters,
      _t: filters._t || timestamp
    };
    
    const response = await apiRequest<{ requests: PurchaseRequest[], pagination: any }>(
      'products/client-purchase-requests',
      'GET',
      undefined,
      requestFilters
    );
    
    return response;
  } catch (error) {
    console.error('Error fetching client purchase requests:', error);
    throw error;
  }
};

// Function to approve a purchase request
export const approvePurchaseRequest = async (id: string) => {
  console.log(`Approving purchase request ${id}`);
  
  try {
    const response = await apiRequest<any>(
      `products/purchase-requests/${id}/approve`,
      'POST'
    );
    
    return response;
  } catch (error) {
    console.error(`Error approving purchase request ${id}:`, error);
    throw error;
  }
};

// Function to reliably approve a purchase request (with inventory transfer)
export const reliableApprovePurchaseRequest = async (id: string) => {
  console.log(`Reliably approving purchase request ${id} with inventory transfer`);
  
  if (!id) {
    console.error('No purchase request ID provided for approval');
    throw new Error('Purchase request ID is required');
  }
  
  // Ensure we have an authentication token
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token available for purchase request approval');
    throw new Error('Authentication required for this action');
  }
  
  try {
    // Try up to 3 different endpoints to find one that works
    const endpoints = [
      `products/purchase-requests/${id}/reliable-approve`,
      `api/products/purchase-requests/${id}/reliable-approve`,
      `/api/products/purchase-requests/${id}/reliable-approve`
    ];
    
    let lastError = null;
    
    for (let i = 0; i < endpoints.length; i++) {
      try {
        console.log(`Attempt ${i+1}: Approving purchase request using endpoint: ${endpoints[i]}`);
        const response = await apiRequest<any>(
          endpoints[i],
          'POST',
          undefined,
          undefined,
          30000  // Extended timeout (30 seconds)
        );
        
        console.log('Purchase request approval successful:', response);
        return response;
      } catch (error: any) {
        console.warn(`Attempt ${i+1} failed:`, error.message);
        lastError = error;
        
        // If this is a 404 error (endpoint not found), try the next endpoint
        if (error.response?.status === 404) {
          continue;
        }
        
        // For other errors, retry if we have more endpoints to try
        if (i < endpoints.length - 1) {
          console.log(`Retrying with next endpoint...`);
        } else {
          // We've tried all endpoints, throw the last error
          throw error;
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('All approval endpoints failed');
  } catch (error: any) {
    console.error(`Error in reliable approval of purchase request ${id}:`, error);
    
    // Add better error messaging for common issues
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to approve this purchase request');
    } else if (error.response?.status === 404) {
      throw new Error('Purchase request not found or already processed');
    } else if (error.response?.status === 500) {
      // For server errors, include any additional information
      const errorMessage = error.response.data?.message || 'Server error during approval';
      const details = error.response.data?.error 
        ? ` (${error.response.data.error})` 
        : '';
      throw new Error(`${errorMessage}${details}`);
    }
    
    // For other errors, return a generic message
    throw error;
  }
};

// Function to reject a purchase request
export const rejectPurchaseRequest = async (id: string, reason: string) => {
  console.log(`Rejecting purchase request ${id} with reason: ${reason}`);
  
  try {
    const response = await apiRequest<any>(
      `products/purchase-requests/${id}/reject`,
      'POST',
      { reason }
    );
    
    return response;
  } catch (error) {
    console.error(`Error rejecting purchase request ${id}:`, error);
    throw error;
  }
};

// Client Inventory Functions

// Define ClientProduct interface
export interface ClientProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel: number;
  lastUpdated: string;
  purchaseDate: string;
  originalProductId: string;
  images?: string[];
}

// Define ClientProductResponse interface
export interface ClientProductResponse {
  success: boolean;
  totalItems: number;
  totalApprovedStock: number;
  products: ClientProduct[];
  lastUpdated: string;
}

/**
 * Get client products inventory data
 * @returns Promise with client products inventory data
 */
export const getClientProducts = async (): Promise<ClientProductResponse> => {
  try {
    console.log('Fetching client products data from API...');
    
    const response = await apiRequest<ClientProductResponse>('products/client-products', 'GET');
    console.log('Client products API response:', response);
    
    return response;
  } catch (error) {
    console.error('Error fetching client products:', error);
    throw error;
  }
};