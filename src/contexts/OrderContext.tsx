import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
// InventoryContext import removed

// Define order status types
export type OrderStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'on_hold';

// Define order item type
export type OrderItem = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
};

// Define order type
export type Order = {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerType: 'client' | 'dealer' | 'end_consumer';
  sellerId: string;
  sellerName: string;
  sellerType: 'admin' | 'client';
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingNumber?: string;
  history: {
    status: OrderStatus;
    timestamp: string;
    updatedBy: string;
    notes?: string;
  }[];
};

// Define order context type
type OrderContextType = {
  orders: Order[];
  loading: boolean;
  error: string | null;
  getOrders: (filters?: { status?: OrderStatus; customerId?: string; sellerId?: string; dateRange?: { start: string; end: string } }) => Order[];
  getOrderById: (id: string) => Order | undefined;
  createOrder: (orderData: Omit<Order, '_id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getOrdersByRole: () => Order[];
};

// Create the order context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Empty orders array - removed mock orders data
const mockOrders: Order[] = [];

// Create order provider
export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all orders with optional filters
  const getOrders = (filters?: { status?: OrderStatus; customerId?: string; sellerId?: string; dateRange?: { start: string; end: string } }) => {
    if (!filters) return orders;

    return orders.filter(order => {
      // Filter by status
      if (filters.status && order.status !== filters.status) return false;
      
      // Filter by customer ID
      if (filters.customerId && order.customerId !== filters.customerId) return false;
      
      // Filter by seller ID
      if (filters.sellerId && order.sellerId !== filters.sellerId) return false;
      
      // Filter by date range
      if (filters.dateRange) {
        const orderDate = new Date(order.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        
        if (orderDate < startDate || orderDate > endDate) return false;
      }
      
      return true;
    });
  };

  // Get order by ID
  const getOrderById = (id: string) => {
    return orders.find(order => order._id === id);
  };

  // Create new order
  const createOrder = async (orderData: Omit<Order, '_id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'history'>): Promise<Order> => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to create an order');
      }

      // Generate a new ID and order number
      const newId = (orders.length + 1).toString();
      const orderNumber = `ORD-${new Date().getFullYear()}-${(orders.length + 1).toString().padStart(3, '0')}`;
      
      const now = new Date().toISOString();
      const dateOnly = now.split('T')[0];
      
      // Create new order
      const newOrder: Order = {
        _id: newId,
        orderNumber,
        ...orderData,
        createdAt: dateOnly,
        updatedAt: dateOnly,
        history: [
          {
            status: orderData.status,
            timestamp: now,
            updatedBy: user.name,
            notes: 'Order created'
          }
        ]
      };

      // Add to state
      setOrders([...orders, newOrder]);

      // In a real app, we would make an API call here
      // const response = await fetch('/api/orders', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify(newOrder),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to create order');
      // }
      // 
      // const data = await response.json();
      // return data;

      return newOrder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update order
  const updateOrder = async (id: string, data: Partial<Order>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to update an order');
      }

      // Find the order
      const orderIndex = orders.findIndex(order => order._id === id);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const now = new Date().toISOString();
      const dateOnly = now.split('T')[0];
      
      // Update order
      const updatedOrder = {
        ...orders[orderIndex],
        ...data,
        updatedAt: dateOnly
      };

      // Update state
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = updatedOrder;
      setOrders(updatedOrders);

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/orders/${id}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify(data),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to update order');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (id: string, status: OrderStatus, notes?: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to update order status');
      }

      // Find the order
      const orderIndex = orders.findIndex(order => order._id === id);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const now = new Date().toISOString();
      const dateOnly = now.split('T')[0];
      
      // Create history entry
      const historyEntry = {
        status,
        timestamp: now,
        updatedBy: user.name,
        notes
      };

      // Update order
      const updatedOrder = {
        ...orders[orderIndex],
        status,
        updatedAt: dateOnly,
        history: [...orders[orderIndex].history, historyEntry]
      };

      // If status is 'shipped', set tracking information if available
      if (status === 'shipped') {
        // Additional shipping logic can be added here if needed
      }

      // If status is 'delivered', update actual delivery date
      if (status === 'delivered') {
        updatedOrder.actualDeliveryDate = dateOnly;
      }

      // Update state
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = updatedOrder;
      setOrders(updatedOrders);

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/orders/${id}/status`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify({ status, notes }),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to update order status');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete order
  const deleteOrder = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Remove from state
      setOrders(orders.filter(order => order._id !== id));

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/orders/${id}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to delete order');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get orders based on user role
  const getOrdersByRole = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        // Manufacturer sees all orders where they are the seller
        return orders.filter(order => order.sellerType === 'admin');
      
      case 'client':
        // Client sees orders where they are either the customer (buying from manufacturer)
        // or the seller (selling to dealers)
        return orders.filter(order => 
          (order.customerId === user.id && order.customerType === 'client') || 
          (order.sellerId === user.id && order.sellerType === 'client')
        );
      
      case 'dealer':
        // Dealer only sees orders where they are the customer
        return orders.filter(order => 
          order.customerId === user.id && order.customerType === 'dealer'
        );
      
      default:
        return [];
    }
  };

  const value = {
    orders,
    loading,
    error,
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getOrdersByRole,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

// Create hook for using order context
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export default OrderContext;