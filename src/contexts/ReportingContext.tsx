import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
// OrderContext import removed
import { useProducts } from './ProductContext';

// Define report types
export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Sales report type
export type SalesReport = {
  timeFrame: TimeFrame;
  data: {
    period: string;
    revenue: number;
    units: number;
    orders: number;
  }[];
  totals: {
    revenue: number;
    units: number;
    orders: number;
  };
  comparisonWithPrevious: {
    revenue: number;
    units: number;
    orders: number;
  };
};

// Inventory report type
export type InventoryReport = {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  topMovingItems: {
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
  }[];
  slowMovingItems: {
    productId: string;
    productName: string;
    sku: string;
    daysInStock: number;
    currentStock: number;
  }[];
};

// Customer report type
export type CustomerReport = {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  topCustomers: {
    customerId: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
  }[];
  customerRetentionRate: number;
};

// Product performance report type
export type ProductPerformanceReport = {
  topSellingProducts: {
    productId: string;
    productName: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }[];
  productCategoryBreakdown: {
    category: string;
    unitsSold: number;
    revenue: number;
    percentageOfTotal: number;
  }[];
  productProfitMargins: {
    productId: string;
    productName: string;
    sku: string;
    averageSellingPrice: number;
    costPrice: number;
    profitMargin: number;
  }[];
};

// Define reporting context type
type ReportingContextType = {
  loading: boolean;
  error: string | null;
  getSalesReport: (timeFrame: TimeFrame, dateRange?: { start: string; end: string }) => SalesReport;
  getInventoryReport: () => InventoryReport;
  getCustomerReport: () => CustomerReport;
  getProductPerformanceReport: () => ProductPerformanceReport;
  getDashboardMetrics: () => {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    pendingOrders: number;
    lowStockItems: number;
    topSellingProduct: {
      productId: string;
      productName: string;
      unitsSold: number;
    };
  };
};

// Create the reporting context
const ReportingContext = createContext<ReportingContextType | undefined>(undefined);

// Create reporting provider
export const ReportingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // OrderContext dependency removed - using mock orders instead
  const { products } = useProducts();
  
  // Empty mock orders array - removed mock data
  const mockOrders: any[] = [];
  
  // Mock function to replace getOrdersByRole
  const getOrdersByRole = () => mockOrders;
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate mock sales data for different time frames
  const generateMockSalesData = (timeFrame: TimeFrame, dateRange?: { start: string; end: string }) => {
    const now = new Date();
    let periods: string[] = [];
    let data: SalesReport['data'] = [];
    
    // Generate period labels based on time frame
    switch (timeFrame) {
      case 'daily':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'weekly':
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          const weekNumber = Math.ceil((date.getDate() + 6 - date.getDay()) / 7);
          periods.push(`Week ${weekNumber}`);
        }
        break;
      case 'monthly':
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push(date.toLocaleString('default', { month: 'short' }));
        }
        break;
      case 'quarterly':
        // Last 4 quarters
        for (let i = 3; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (i * 3));
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periods.push(`Q${quarter} ${date.getFullYear()}`);
        }
        break;
      case 'yearly':
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
          const date = new Date(now);
          date.setFullYear(date.getFullYear() - i);
          periods.push(date.getFullYear().toString());
        }
        break;
    }

    // Generate mock data for each period
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalOrders = 0;

    data = periods.map(period => {
      // Generate random but realistic values
      // Values should be higher for more recent periods to show growth
      const index = periods.indexOf(period);
      const growthFactor = 1 + (index / periods.length) * 0.5; // More recent periods have higher values
      
      // Base values depend on user role
      let baseRevenue = 0;
      let baseUnits = 0;
      let baseOrders = 0;
      
      if (user) {
        switch (user.role) {
          case 'superadmin': // Manufacturer
          case 'admin': // Manufacturer 
            baseRevenue = 500000;
            baseUnits = 200;
            baseOrders = 20;
            break;
          case 'client': // Distributor
            baseRevenue = 200000;
            baseUnits = 100;
            baseOrders = 15;
            break;
          case 'dealer': // Retailer
            baseRevenue = 50000;
            baseUnits = 30;
            baseOrders = 10;
            break;
          default:
            baseRevenue = 100000;
            baseUnits = 50;
            baseOrders = 10;
        }
      } else {
        baseRevenue = 100000;
        baseUnits = 50;
        baseOrders = 10;
      }
      
      // Add some randomness
      const randomFactor = 0.8 + Math.random() * 0.4; // Between 0.8 and 1.2
      
      const revenue = Math.round(baseRevenue * growthFactor * randomFactor);
      const units = Math.round(baseUnits * growthFactor * randomFactor);
      const orderCount = Math.round(baseOrders * growthFactor * randomFactor);
      
      totalRevenue += revenue;
      totalUnits += units;
      totalOrders += orderCount;
      
      return {
        period,
        revenue,
        units,
        orders: orderCount
      };
    });

    // Calculate comparison with previous period (simplified)
    const previousPeriodRevenue = totalRevenue * 0.9; // Assume 10% growth
    const previousPeriodUnits = totalUnits * 0.9;
    const previousPeriodOrders = totalOrders * 0.9;

    const comparisonWithPrevious = {
      revenue: ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100,
      units: ((totalUnits - previousPeriodUnits) / previousPeriodUnits) * 100,
      orders: ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
    };

    return {
      timeFrame,
      data,
      totals: {
        revenue: totalRevenue,
        units: totalUnits,
        orders: totalOrders
      },
      comparisonWithPrevious
    };
  };

  // Get sales report
  const getSalesReport = (timeFrame: TimeFrame, dateRange?: { start: string; end: string }): SalesReport => {
    // In a real app, this would fetch data from an API
    // For demo purposes, we'll generate mock data
    return generateMockSalesData(timeFrame, dateRange);
  };

  // Get inventory report - empty data
  const getInventoryReport = (): InventoryReport => {
    try {
      // Return empty inventory report data
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        topMovingItems: [],
        slowMovingItems: []
      };
    } catch (error) {
      console.error('Error generating inventory report:', error);
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        topMovingItems: [],
        slowMovingItems: []
      };
    }
  };

  // Get customer report
  const getCustomerReport = (): CustomerReport => {
    // In a real app, this would fetch data from an API
    // For demo purposes, we'll generate mock data
    
    // Get relevant customers based on user role
    const userOrders = getOrdersByRole();
    
    // Extract unique customer IDs
    const customerIds = Array.from(new Set(userOrders.map(order => order.customerId)));
    
    // Generate mock top customers
    const topCustomers = [
      {
        customerId: '2',
        customerName: 'TechCorp Distributors',
        totalOrders: 12,
        totalSpent: 1250000,
        lastOrderDate: '2025-05-15'
      },
      {
        customerId: '4',
        customerName: 'Northeast Distributors',
        totalOrders: 8,
        totalSpent: 980000,
        lastOrderDate: '2025-05-20'
      },
      {
        customerId: '7',
        customerName: 'West Coast Distribution',
        totalOrders: 6,
        totalSpent: 720000,
        lastOrderDate: '2025-05-10'
      }
    ];
    
    return {
      totalCustomers: customerIds.length,
      newCustomers: Math.round(customerIds.length * 0.2), // Assume 20% are new
      activeCustomers: Math.round(customerIds.length * 0.8), // Assume 80% are active
      topCustomers,
      customerRetentionRate: 85 // 85% retention rate
    };
  };

  // Get product performance report
  const getProductPerformanceReport = (): ProductPerformanceReport => {
    // In a real app, this would fetch data from an API
    // For demo purposes, we'll generate mock data
    
    // Generate mock top selling products
    const topSellingProducts = [
      {
        productId: '2',
        productName: 'Standard Model Y',
        sku: 'SMY-002',
        unitsSold: 72,
        revenue: 2160000
      },
      {
        productId: '1',
        productName: 'Premium Model X',
        sku: 'PMX-001',
        unitsSold: 45,
        revenue: 1800000
      },
      {
        productId: '4',
        productName: 'Luxury Model A',
        sku: 'LMA-004',
        unitsSold: 18,
        revenue: 1080000
      },
      {
        productId: '3',
        productName: 'Economy Model Z',
        sku: 'EMZ-003',
        unitsSold: 35,
        revenue: 700000
      }
    ];
    
    // Generate mock category breakdown
    const productCategoryBreakdown = [
      {
        category: 'Premium',
        unitsSold: 63,
        revenue: 2880000,
        percentageOfTotal: 48
      },
      {
        category: 'Standard',
        unitsSold: 72,
        revenue: 2160000,
        percentageOfTotal: 36
      },
      {
        category: 'Economy',
        unitsSold: 35,
        revenue: 700000,
        percentageOfTotal: 12
      },
      {
        category: 'Luxury',
        unitsSold: 18,
        revenue: 1080000,
        percentageOfTotal: 18
      }
    ];
    
    // Generate mock profit margins
    const productProfitMargins = [
      {
        productId: '1',
        productName: 'Premium Model X',
        sku: 'PMX-001',
        averageSellingPrice: 45000,
        costPrice: 32000,
        profitMargin: 28.9
      },
      {
        productId: '2',
        productName: 'Standard Model Y',
        sku: 'SMY-002',
        averageSellingPrice: 35000,
        costPrice: 25000,
        profitMargin: 28.6
      },
      {
        productId: '3',
        productName: 'Economy Model Z',
        sku: 'EMZ-003',
        averageSellingPrice: 23000,
        costPrice: 17000,
        profitMargin: 26.1
      },
      {
        productId: '4',
        productName: 'Luxury Model A',
        sku: 'LMA-004',
        averageSellingPrice: 68000,
        costPrice: 45000,
        profitMargin: 33.8
      }
    ];
    
    return {
      topSellingProducts,
      productCategoryBreakdown,
      productProfitMargins
    };
  };

  // Get dashboard metrics
  const getDashboardMetrics = () => {
    const userOrders = getOrdersByRole();
    // No mock inventory data
    const lowStockItemsCount = 0;
    
    // Calculate total revenue
    const totalRevenue = userOrders.reduce((total, order) => total + order.finalAmount, 0);
    
    // Calculate average order value
    const averageOrderValue = userOrders.length > 0 ? totalRevenue / userOrders.length : 0;
    
    // Count pending orders
    const pendingOrders = userOrders.filter(order => 
      ['draft', 'pending_approval', 'approved', 'processing'].includes(order.status)
    ).length;
    
    // Get top selling product (simplified)
    const topSellingProduct = {
      productId: '2',
      productName: 'Standard Model Y',
      unitsSold: 72
    };
    
    return {
      totalRevenue,
      totalOrders: userOrders.length,
      averageOrderValue,
      pendingOrders,
      lowStockItems: lowStockItemsCount,
      topSellingProduct
    };
  };

  const value = {
    loading,
    error,
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getProductPerformanceReport,
    getDashboardMetrics
  };

  return <ReportingContext.Provider value={value}>{children}</ReportingContext.Provider>;
};

// Create hook for using reporting context
export const useReporting = () => {
  const context = useContext(ReportingContext);
  if (context === undefined) {
    throw new Error('useReporting must be used within a ReportingProvider');
  }
  return context;
};

export default ReportingContext;