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
    // Special handling for client users to ensure we get their inventory
    console.log('TRACE: Client user detected, adding client-specific filters');
    
    // Always include the client ID for filtering
    requestFilters.clientId = currentUser.id;
    
    // Set hasClientInventory to true to look for products with clientInventory fields
    requestFilters.hasClientInventory = true;
    
    // Force include created products
    requestFilters.isClientUploaded = true;
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
        createdBy: sample.createdBy
      });
    } else {
      console.log('TRACE: No products returned');
      
      // If client user and no products, try with different filters as fallback
      if (currentUser?.role === 'client') {
        console.log('TRACE: Client user with no products, trying direct lookup by createdBy');
        
        // Try a direct lookup as fallback
        const fallbackResponse = await fetch(`/api/products?createdBy=${currentUser.id}&_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Client-ID': currentUser.id
          }
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(`TRACE: Fallback returned ${fallbackData.products?.length || 0} products`);
          
          if (fallbackData.products && fallbackData.products.length > 0) {
            return fallbackData;
          }
        }
        
        // Last resort - try debug endpoint
        console.log('TRACE: Trying debug endpoint as last resort');
        const debugResponse = await fetch(`/api/products/debug-client-inventory?clientId=${currentUser.id}&_t=${Date.now()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Client-ID': currentUser.id
          }
        });
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log(`TRACE: Debug endpoint found ${debugData.products?.length || 0} products`);
          
          if (debugData.products && debugData.products.length > 0) {
            // Convert debug format to regular API response format
            return {
              products: debugData.products,
              pagination: { total: debugData.products.length, page: 1, limit: 50, pages: 1 }
            };
          }
        }
      }
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
  
  try {
    const response = await apiRequest<any>(
      `products/purchase-requests/${id}/reliable-approve`,
      'POST'
    );
    
    return response;
  } catch (error) {
    console.error(`Error in reliable approval of purchase request ${id}:`, error);
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