// Inventory API service for centralized inventory management API calls
import { apiRequest } from './api';
import { InventoryItem, InventoryAllocation } from '../contexts/InventoryContext';

// Define loyalty points calculation parameters
export type LoyaltyPointsParams = {
  productId: string;
  quantity: number;
  userRole: string;
  productCategory?: string;
  productStatus?: string;
};

// Define inventory allocation parameters
export type AllocationParams = {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
  }[];
};

// API endpoints for inventory management
export const inventoryApi = {
  // Get all inventory items
  getInventory: () => apiRequest<InventoryItem[]>('/inventory'),
  
  // Get inventory item by ID
  getInventoryItemById: (id: string) => apiRequest<InventoryItem>(`/inventory/${id}`),
  
  // Update inventory item
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => 
    apiRequest<InventoryItem>(`/inventory/${id}`, 'PUT', data),
  
  // Get all allocations
  getAllocations: () => apiRequest<InventoryAllocation[]>('/inventory/allocations'),
  
  // Create new allocation
  createAllocation: (data: AllocationParams) => 
    apiRequest<InventoryAllocation>('/inventory/allocations', 'POST', data),
  
  // Update allocation status
  updateAllocationStatus: (id: string, status: 'pending' | 'completed' | 'cancelled') => 
    apiRequest<InventoryAllocation>(`/inventory/allocations/${id}/status`, 'PATCH', { status }),
  
  // Calculate loyalty points for a product allocation or sale
  calculateLoyaltyPoints: (params: LoyaltyPointsParams) => 
    apiRequest<{ points: number }>('/loyalty/calculate-points', 'POST', params),
  
  // Get loyalty points history
  getLoyaltyPointsHistory: (userId: string) => 
    apiRequest<{ date: string; description: string; points: number; balance: number }[]>(
      `/loyalty/history/${userId}`
    ),
  
  // Get loyalty points balance
  getLoyaltyPointsBalance: (userId: string) => 
    apiRequest<{ balance: number; lifetimePoints: number }>(`/loyalty/balance/${userId}`),
};

// Mock implementation of loyalty points calculation
export const calculateLoyaltyPoints = (
  productCategory: string,
  quantity: number,
  pointsPerUnit: number,
  userRole: string,
  productStatus?: string
): number => {
  // Base points calculation
  let points = pointsPerUnit * quantity;
  
  // Apply role-specific bonuses
  if (userRole === 'client') {
    // Clients get bonus points for premium products
    if (productCategory === 'Premium' || productCategory === 'Luxury') {
      points *= 1.2; // 20% bonus for premium products
    }
    
    // Volume bonus for large allocations
    if (quantity >= 20) {
      points *= 1.1; // 10% volume bonus
    }
  } else if (userRole === 'dealer') {
    // Dealers get bonus points for selling economy models (harder to sell)
    if (productCategory === 'Economy') {
      points *= 1.15; // 15% bonus for economy products
    }
    
    // Bonus for selling low stock items (helping clear inventory)
    if (productStatus === 'low_stock') {
      points *= 1.05; // 5% bonus for low stock items
    }
  }
  
  return Math.round(points);
};