import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Product, getProducts } from '../services/productsApi';
import { toast } from 'react-hot-toast';

export type InventoryItem = {
  id: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  location: string;
  lastUpdated: string;
  productId: string;
};

export type InventoryAllocation = {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    pointsEarned: number;
  }[];
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type Target = {
  id: string;
  name: string;
  email?: string;
};

// Empty inventory data
const initialInventory: InventoryItem[] = [];
const initialAllocations: InventoryAllocation[] = [];

interface InventoryContextType {
  inventory: InventoryItem[];
  allocations: InventoryAllocation[];
  loading: boolean;
  error: string | null;
  getInventory: () => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  allocateInventory: (targetId: string, targetName: string, items: { productId: string; quantity: number }[]) => Promise<boolean>;
  calculateLoyaltyPoints: (productId: string, quantity: number) => number;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [allocations, setAllocations] = useState<InventoryAllocation[]>(initialAllocations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert products from API to inventory items
  const convertProductsToInventory = (products: Product[]): InventoryItem[] => {
    return products.map(product => {
      const reorderLevel = product.reorderLevel || 5;
      const status = 
        product.stock === 0 
          ? 'out_of_stock' 
          : product.stock <= reorderLevel
            ? 'low_stock' 
            : 'in_stock';
      
      return {
        id: product._id || '',
        productId: product._id || '',
        productName: product.name,
        productSku: product.sku,
        category: product.category || 'Uncategorized',
        quantity: product.stock || 0,
        availableQuantity: product.stock || 0,
        reservedQuantity: product.reservedStock || 0,
        reorderLevel,
        status,
        location: 'Main Warehouse',
        lastUpdated: product.updatedAt || new Date().toISOString()
      };
    });
  };

  const getInventory = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching inventory products for user:', user);
      
      // For admin users, don't apply any filters
      // For client users, filter by createdBy
      const filters = user.role === 'admin' 
        ? {} 
        : { createdBy: user.id };
      
      console.log('Using filters for inventory products:', filters);
      const response = await getProducts(filters);
      console.log('API Response products:', response.products);
      
      if (!response.products || response.products.length === 0) {
        console.warn('No products returned from API');
      } else {
        console.log('Product sample:', response.products[0]);
        console.log('Stock value type:', typeof response.products[0].stock);
        console.log('ReorderLevel value type:', typeof response.products[0].reorderLevel);
      }
      
      const inventoryItems = convertProductsToInventory(response.products);
      console.log('Converted inventory items:', inventoryItems);
      
      if (inventoryItems.length !== response.products.length) {
        console.warn(`Conversion mismatch: ${response.products.length} products -> ${inventoryItems.length} inventory items`);
      }
      
      setInventory(inventoryItems);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Update inventory item (for adjustments)
  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, you would call an API to update the inventory
      setInventory(prev => {
        return prev.map(item => {
          if (item.id === id) {
            const updatedItem = { ...item, ...updates, lastUpdated: new Date().toISOString() };
            
            // Update status based on quantity
            if (updatedItem.quantity === 0) {
              updatedItem.status = 'out_of_stock';
            } else if (updatedItem.quantity <= updatedItem.reorderLevel) {
              updatedItem.status = 'low_stock';
            } else {
              updatedItem.status = 'in_stock';
            }
            
            return updatedItem;
          }
          return item;
        });
      });
      toast.success('Inventory updated successfully');
    } catch (err) {
      console.error('Error updating inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
      toast.error('Failed to update inventory');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Allocate inventory to a target (client/dealer)
  const allocateInventory = async (
    targetId: string, 
    targetName: string, 
    items: { productId: string; quantity: number }[]
  ): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    try {
      // Check if all items are available in sufficient quantity
      const insufficientItems = items.filter(item => {
        const inventoryItem = inventory.find(invItem => invItem.productId === item.productId);
        return !inventoryItem || inventoryItem.availableQuantity < item.quantity;
      });
      
      if (insufficientItems.length > 0) {
        throw new Error('Insufficient inventory for one or more items');
      }
      
      // Create allocation record
      const allocationItems = items.map(item => {
        const product = inventory.find(invItem => invItem.productId === item.productId);
        const points = calculateLoyaltyPoints(item.productId, item.quantity);
        
        return {
          productId: item.productId,
          productName: product?.productName || 'Unknown Product',
          quantity: item.quantity,
          pointsEarned: points
        };
      });
      
      const newAllocation: InventoryAllocation = {
        id: `alloc-${Date.now()}`,
        sourceId: user.id || '',
        sourceName: user.name || user.email || 'Unknown User',
        targetId,
        targetName,
        items: allocationItems,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update inventory quantities
      setInventory(prev => {
        return prev.map(item => {
          const allocationItem = items.find(i => i.productId === item.productId);
          if (allocationItem) {
            const newQuantity = item.availableQuantity - allocationItem.quantity;
            const newStatus = 
              newQuantity === 0 
                ? 'out_of_stock' 
                : newQuantity <= item.reorderLevel 
                  ? 'low_stock' 
                  : 'in_stock';
            
            return {
              ...item,
              availableQuantity: newQuantity,
              reservedQuantity: item.reservedQuantity + allocationItem.quantity,
              status: newStatus,
              lastUpdated: new Date().toISOString()
            };
          }
          return item;
        });
      });
      
      // Add allocation to the list
      setAllocations(prev => [...prev, newAllocation]);
      
      toast.success('Inventory allocated successfully');
      return true;
    } catch (err) {
      console.error('Error allocating inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to allocate inventory');
      toast.error(err instanceof Error ? err.message : 'Failed to allocate inventory');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Calculate loyalty points for a product
  const calculateLoyaltyPoints = (productId: string, quantity: number): number => {
    const product = inventory.find(item => item.productId === productId);
    if (!product) return 0;
    
    // Basic calculation based on product category
    let multiplier = 1;
    
    // Premium products earn more points
    if (product.category.toLowerCase().includes('luxury') || 
        product.category.toLowerCase().includes('premium')) {
      multiplier = 1.5;
    }
    
    // Low stock items earn bonus points (incentivize moving them)
    if (product.status === 'low_stock') {
      multiplier += 0.2;
    }
    
    // Calculate total points
    return Math.round(quantity * multiplier * 10);
  };

  // Initial data load - only refresh if needed
  useEffect(() => {
    if (user) {
      getInventory();
    }
  }, [user]);

  const value = {
    inventory,
    allocations,
    loading,
    error,
    getInventory,
    updateInventoryItem,
    allocateInventory,
    calculateLoyaltyPoints
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export default InventoryContext;