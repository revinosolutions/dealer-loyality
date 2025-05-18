import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications, NotificationType, NotificationPriority, NotificationStatus } from './NotificationContext';
import * as productsApi from '../services/productsApi';

// Define product category type
export type ProductCategory = {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
};

// Define product status type
export type ProductStatus = 'active' | 'discontinued' | 'out_of_stock' | 'coming_soon';

// Define product type
export type Product = {
  _id: string;
  name: string;
  sku: string;
  description: string;
  categories: string[];
  pricing: {
    manufacturerPrice: number; // Base price (manufacturer to client)
    suggestedClientPrice: number; // Suggested price for clients to sell to dealers
    suggestedRetailPrice: number; // Suggested price for dealers to sell to end consumers
    minimumClientPrice?: number; // Minimum price clients can sell to dealers
    minimumRetailPrice?: number; // Minimum price dealers can sell to end consumers
  };
  inventory: {
    currentStock: number;
    reorderLevel: number;
    reservedStock: number;
  };
  specifications?: Record<string, string>;
  features?: string[];
  images: string[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, any>;
};

// Define product context type
type ProductContextType = {
  products: Product[];
  categories: ProductCategory[];
  loading: boolean;
  error: string | null;
  getProducts: (filters?: { category?: string; status?: ProductStatus; search?: string }) => Product[];
  getProductById: (id: string) => Product | undefined;
  createProduct: (product: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<any>;
  fetchProducts: () => Promise<any>;
  getCategories: () => ProductCategory[];
  createCategory: (category: Omit<ProductCategory, '_id'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<ProductCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getVisiblePricing: (product: Product) => {
    basePrice: number;
    suggestedPrice: number;
    minimumPrice?: number;
  };
};

// Create the product context
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Mock product categories
const mockCategories: ProductCategory[] = [
  {
    _id: '1',
    name: 'Premium',
    description: 'High-end models with advanced features'
  },
  {
    _id: '2',
    name: 'Standard',
    description: 'Mid-range models with balanced features'
  },
  {
    _id: '3',
    name: 'Economy',
    description: 'Entry-level models with essential features'
  },
  {
    _id: '4',
    name: 'Luxury',
    description: 'Premium luxury models with exclusive features'
  },
  {
    _id: '5',
    name: 'Next-Gen',
    description: 'Upcoming next generation models'
  },
  {
    _id: '6',
    name: 'Flagship',
    description: 'Top-of-the-line flagship models',
    parentId: '1'
  },
  {
    _id: '7',
    name: 'Mid-range',
    description: 'Balanced mid-range models',
    parentId: '2'
  },
  {
    _id: '8',
    name: 'Entry-level',
    description: 'Basic entry-level models',
    parentId: '3'
  }
];

// Empty products array - removed mock products data
const mockProducts: Product[] = [];

// Create product provider
export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(mockCategories);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching products from API...');
      const response = await productsApi.getProducts({});
      console.log('Products fetched successfully:', response);
      
      if (response && response.products) {
        // Map API products to match our Product type
        const mappedProducts = response.products.map((apiProduct: any) => {
          // Create a product object that matches our Product type
          const product: Product = {
            _id: apiProduct._id,
            name: apiProduct.name || '',
            sku: apiProduct.sku || '',
            description: apiProduct.description || '',
            categories: apiProduct.category ? [apiProduct.category] : [],
            pricing: {
              manufacturerPrice: apiProduct.price || 0,
              suggestedClientPrice: apiProduct.price ? apiProduct.price * 1.2 : 0,
              suggestedRetailPrice: apiProduct.price ? apiProduct.price * 1.5 : 0,
            },
            inventory: {
              currentStock: apiProduct.stock || 0,
              reorderLevel: apiProduct.reorderLevel || 5,
              reservedStock: apiProduct.reservedStock || 0,
            },
            images: apiProduct.images || [],
            status: apiProduct.status as ProductStatus || 'active',
            createdAt: apiProduct.createdAt || new Date().toISOString(),
            updatedAt: apiProduct.updatedAt || new Date().toISOString(),
          };
          return product;
        });
        
        setProducts(mappedProducts);
      }
      
      return response;
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  // Get all products with optional filters
  const getProducts = (filters?: { category?: string; status?: ProductStatus; search?: string }) => {
    if (!filters) return products;

    return products.filter(product => {
      // Filter by category
      if (filters.category && !product.categories.includes(filters.category)) return false;
      
      // Filter by status
      if (filters.status && product.status !== filters.status) return false;
      
      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    });
  };

  // Get product by ID
  const getProductById = (id: string) => {
    return products.find(product => product._id === id);
  };

  // Create new product
  const createProduct = async (productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to create a product');
      }

      // Only admin (manufacturer) can create products
      if (user.role !== 'admin') {
        throw new Error('Only administrators can create products');
      }

      // Generate a new ID
      const newId = (products.length + 1).toString();
      
      const now = new Date().toISOString().split('T')[0];
      
      // Create new product
      const newProduct: Product = {
        _id: newId,
        ...productData,
        createdAt: now,
        updatedAt: now
      };

      // Add to state
      setProducts([...products, newProduct]);

      // In a real app, we would make an API call here
      // const response = await fetch('/api/products', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify(productData),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to create product');
      // }

      // Notify clients about new product
      if (user.role === 'admin') {
        // In a real app, this would be handled by the server
        // For demo purposes, we'll simulate it here
        // This would typically send notifications to all clients
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (id: string, data: Partial<Product>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to update a product');
      }

      // Only admin (manufacturer) can update products
      if (user.role !== 'admin') {
        throw new Error('Only administrators can update products');
      }

      // Find the product
      const productIndex = products.findIndex(product => product._id === id);
      if (productIndex === -1) {
        throw new Error('Product not found');
      }

      const originalProduct = products[productIndex];
      const now = new Date().toISOString().split('T')[0];
      
      // Update product
      const updatedProduct = {
        ...originalProduct,
        ...data,
        updatedAt: now
      };

      // Check if pricing has changed
      const hasPricingChanged = data.pricing && (
        data.pricing.manufacturerPrice !== originalProduct.pricing.manufacturerPrice ||
        data.pricing.suggestedClientPrice !== originalProduct.pricing.suggestedClientPrice ||
        data.pricing.suggestedRetailPrice !== originalProduct.pricing.suggestedRetailPrice
      );

      // Update state
      const updatedProducts = [...products];
      updatedProducts[productIndex] = updatedProduct;
      setProducts(updatedProducts);

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/products/${id}`, {
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
      //   throw new Error(errorData.message || 'Failed to update product');
      // }

      // Notify about price changes if applicable
      if (hasPricingChanged) {
        // In a real app, this would be handled by the server
        // For demo purposes, we'll simulate it here
        // This would typically send notifications to all clients
        try {
          // Send notification to clients about price change
          // This is simplified for the mock implementation
          sendNotification({
            userId: '2', // Sarah Johnson (client)
            type: 'price_change' as NotificationType,
            title: 'Price Change Notification',
            message: `The pricing for ${updatedProduct.name} (${updatedProduct.sku}) has been updated.`,
            priority: 'medium' as NotificationPriority,
            status: 'unread' as NotificationStatus,
            relatedEntityId: updatedProduct._id,
            relatedEntityType: 'product',
            actionUrl: `/products/${updatedProduct._id}`
          });
        } catch (error) {
          console.error('Failed to send price change notification:', error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const deleteProduct = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to delete a product');
      }

      // Only admin (manufacturer) can delete products
      if (user.role !== 'admin') {
        throw new Error('Only administrators can delete products');
      }

      console.log(`Deleting product with ID: ${id}`);
      
      // Immediately remove the product from the state to give instant feedback
      setProducts(prevProducts => prevProducts.filter(product => product._id !== id));
      
      // Make the API call to delete the product
      const response = await productsApi.deleteProduct(id);
      console.log('Product deletion response:', response);
      
      // Force a refresh of the products list to ensure consistency with the backend
      await fetchProducts();
      
      return response;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // If the deletion fails, refresh the products list to restore the product
      fetchProducts().catch(refreshErr => {
        console.error('Failed to refresh products after deletion error:', refreshErr);
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get all categories
  const getCategories = () => {
    return categories;
  };

  // Create new category
  const createCategory = async (categoryData: Omit<ProductCategory, '_id'>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to create a category');
      }

      // Only admin (manufacturer) can create categories
      if (user.role !== 'admin') {
        throw new Error('Only administrators can create categories');
      }

      // Generate a new ID
      const newId = (categories.length + 1).toString();
      
      // Create new category
      const newCategory: ProductCategory = {
        _id: newId,
        ...categoryData
      };

      // Add to state
      setCategories([...categories, newCategory]);

      // In a real app, we would make an API call here
      // const response = await fetch('/api/categories', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify(categoryData),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to create category');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update category
  const updateCategory = async (id: string, data: Partial<ProductCategory>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to update a category');
      }

      // Only admin (manufacturer) can update categories
      if (user.role !== 'admin') {
        throw new Error('Only administrators can update categories');
      }

      // Update category in state
      const updatedCategories = categories.map(category => {
        if (category._id === id) {
          return { ...category, ...data };
        }
        return category;
      });

      setCategories(updatedCategories);

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/categories/${id}`, {
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
      //   throw new Error(errorData.message || 'Failed to update category');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to delete a category');
      }

      // Only admin (manufacturer) can delete categories
      if (user.role !== 'admin') {
        throw new Error('Only administrators can delete categories');
      }

      // Check if category is in use
      const categoryToDelete = categories.find(category => category._id === id);
      if (!categoryToDelete) {
        throw new Error('Category not found');
      }

      const categoryName = categoryToDelete.name;
      const productsUsingCategory = products.some(product => 
        product.categories.includes(categoryName)
      );

      if (productsUsingCategory) {
        throw new Error('Cannot delete category that is in use by products');
      }

      // Check if category has children
      const hasChildren = categories.some(category => category.parentId === id);
      if (hasChildren) {
        throw new Error('Cannot delete category that has subcategories');
      }

      // Remove from state
      setCategories(categories.filter(category => category._id !== id));

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/categories/${id}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to delete category');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get visible pricing based on user role
  const getVisiblePricing = (product: Product) => {
    if (!user) {
      // Public view (no login) - only show retail price
      return {
        basePrice: product.pricing.suggestedRetailPrice,
        suggestedPrice: product.pricing.suggestedRetailPrice
      };
    }

    switch (user.role) {
      case 'admin':
        // Admin sees all products
        return {
          basePrice: product.pricing.manufacturerPrice,
          suggestedPrice: product.pricing.suggestedClientPrice,
          minimumPrice: product.pricing.minimumClientPrice
        };
      
      case 'client':
        // Client sees products allocated to them
        return {
          basePrice: product.pricing.manufacturerPrice,
          suggestedPrice: product.pricing.suggestedRetailPrice,
          minimumPrice: product.pricing.minimumRetailPrice
        };
      
      case 'dealer':
        // Dealer sees products allocated to their client
        return {
          basePrice: product.pricing.suggestedClientPrice,
          suggestedPrice: product.pricing.suggestedRetailPrice
        };
      
      default:
        // Fallback to retail price
        return {
          basePrice: product.pricing.suggestedRetailPrice,
          suggestedPrice: product.pricing.suggestedRetailPrice
        };
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const value = {
    products,
    categories,
    loading,
    error,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    fetchProducts,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getVisiblePricing,
  };

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

// Create hook for using product context
export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export default ProductContext;