import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface DealerSlot {
  _id: string;
  name: string;
  description: string;
  originalProduct: {
    _id: string;
    name: string;
    sku: string;
    category: string;
  };
  clientId: {
    _id: string;
    name: string;
  };
  dealerPrice: number;
  loyaltyPoints: number;
  quantity: number;
  availableQuantity: number;
  redemptionRules: {
    pointsRequired: number;
    discountPercentage: number;
    additionalBenefits: string[];
  };
  expiryDate: string | null;
}

const DealerCatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [dealerSlots, setDealerSlots] = useState<DealerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minPoints, setMinPoints] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Cart
  const [cart, setCart] = useState<{ slotId: string; quantity: number }[]>([]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dealer-slots/available/list');
        setDealerSlots(response.data.dealerSlots);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(response.data.dealerSlots.map((slot: DealerSlot) => slot.originalProduct.category))
        ) as string[];
        setCategories(uniqueCategories);
        
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch available slots');
        console.error('Error fetching available slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search with filters in a real app
    console.log('Search with filters:', {
      minPrice, maxPrice, minPoints, maxPoints, searchQuery, selectedCategory
    });
  };

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinPoints('');
    setMaxPoints('');
    setSearchQuery('');
    setSelectedCategory('');
  };

  const addToCart = (slotId: string) => {
    const existingItem = cart.find(item => item.slotId === slotId);
    
    if (existingItem) {
      // Increment quantity if already in cart
      setCart(cart.map(item => 
        item.slotId === slotId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      // Add new item to cart
      setCart([...cart, { slotId, quantity: 1 }]);
    }
  };

  const removeFromCart = (slotId: string) => {
    setCart(cart.filter(item => item.slotId !== slotId));
  };

  const getCartItemQuantity = (slotId: string) => {
    const item = cart.find(item => item.slotId === slotId);
    return item ? item.quantity : 0;
  };

  const isInCart = (slotId: string) => {
    return cart.some(item => item.slotId === slotId);
  };

  const updateQuantity = (slotId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(slotId);
      return;
    }
    
    const slot = dealerSlots.find(slot => slot._id === slotId);
    
    if (slot && newQuantity <= slot.availableQuantity) {
      setCart(cart.map(item => 
        item.slotId === slotId 
          ? { ...item, quantity: newQuantity } 
          : item
      ));
    }
  };

  // Apply frontend filters
  const filteredSlots = dealerSlots.filter(slot => {
    // Apply category filter
    if (selectedCategory && slot.originalProduct.category !== selectedCategory) {
      return false;
    }
    
    // Apply price filters
    if (minPrice && slot.dealerPrice < parseFloat(minPrice)) {
      return false;
    }
    if (maxPrice && slot.dealerPrice > parseFloat(maxPrice)) {
      return false;
    }
    
    // Apply points filters
    if (minPoints && slot.loyaltyPoints < parseInt(minPoints)) {
      return false;
    }
    if (maxPoints && slot.loyaltyPoints > parseInt(maxPoints)) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        slot.name.toLowerCase().includes(query) ||
        (slot.description && slot.description.toLowerCase().includes(query)) ||
        slot.originalProduct.name.toLowerCase().includes(query) ||
        slot.originalProduct.category.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleCheckout = () => {
    // In a real app, navigate to checkout page with the cart items
    console.log('Checkout with items:', cart);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const slot = dealerSlots.find(slot => slot._id === item.slotId);
      return total + (slot ? slot.dealerPrice * item.quantity : 0);
    }, 0);
  };

  const getTotalPoints = () => {
    return cart.reduce((total, item) => {
      const slot = dealerSlots.find(slot => slot._id === item.slotId);
      return total + (slot ? slot.loyaltyPoints * item.quantity : 0);
    }, 0);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600">Browse available products from your dealers</p>
        </div>
        
        {cart.length > 0 && (
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleCheckout}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Checkout ({cart.length} items)
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
            
            <form onSubmit={handleSearch}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Loyalty Points
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={minPoints}
                    onChange={(e) => setMinPoints(e.target.value)}
                    placeholder="Min"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={maxPoints}
                    onChange={(e) => setMaxPoints(e.target.value)}
                    placeholder="Max"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
          
          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="bg-white shadow-md rounded-lg p-4 mt-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Cart Summary</h2>
              
              <div className="space-y-3">
                {cart.map(item => {
                  const slot = dealerSlots.find(s => s._id === item.slotId);
                  if (!slot) return null;
                  
                  return (
                    <div key={item.slotId} className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">{slot.name}</h3>
                        <div className="flex items-center mt-1">
                          <button 
                            onClick={() => updateQuantity(item.slotId, item.quantity - 1)}
                            className="px-2 py-1 bg-gray-100 rounded-l-md"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.slotId, item.quantity + 1)}
                            className="px-2 py-1 bg-gray-100 rounded-r-md"
                            disabled={item.quantity >= slot.availableQuantity}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">
                          ${(slot.dealerPrice * item.quantity).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600">
                          +{slot.loyaltyPoints * item.quantity} pts
                        </p>
                      </div>
                    </div>
                  );
                })}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">${getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Points:</span>
                    <span>+{getTotalPoints()} pts</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mt-3"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Products grid */}
        <div className="lg:col-span-3">
          {filteredSlots.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <p className="text-gray-500">
                No products found matching your criteria.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSlots.map((slot) => (
                <div
                  key={slot._id}
                  className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col"
                >
                  <div className="p-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">{slot.name}</h2>
                      <p className="text-sm text-gray-600 mb-2">
                        {slot.originalProduct.name} by {slot.clientId.name}
                      </p>
                    </div>
                    
                    {slot.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{slot.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-medium text-gray-800">
                          ${slot.dealerPrice.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Loyalty Points</p>
                        <p className="text-sm font-medium text-green-600">
                          +{slot.loyaltyPoints} pts
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Available</p>
                        <p className="text-sm font-medium text-gray-800">
                          {slot.availableQuantity} units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="text-sm font-medium text-gray-800">
                          {slot.originalProduct.category}
                        </p>
                      </div>
                    </div>
                    
                    {/* Redemption benefits */}
                    {slot.redemptionRules.pointsRequired > 0 && (
                      <div className="mt-2 mb-4 bg-blue-50 p-2 rounded-md">
                        <p className="text-xs font-medium text-blue-700">
                          Redeem {slot.redemptionRules.pointsRequired} points for 
                          {slot.redemptionRules.discountPercentage > 0 
                            ? ` ${slot.redemptionRules.discountPercentage}% discount` 
                            : ' benefits'}
                        </p>
                        {slot.redemptionRules.additionalBenefits.length > 0 && (
                          <ul className="text-xs text-blue-600 mt-1 pl-4 list-disc">
                            {slot.redemptionRules.additionalBenefits.map((benefit, index) => (
                              <li key={index}>{benefit}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto p-4 border-t flex justify-between items-center">
                    <Link
                      to={`/dashboard/dealer-catalog/${slot._id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    
                    {isInCart(slot._id) ? (
                      <div className="flex items-center">
                        <button 
                          onClick={() => updateQuantity(slot._id, getCartItemQuantity(slot._id) - 1)}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-l-md hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 bg-gray-100 text-gray-800">
                          {getCartItemQuantity(slot._id)}
                        </span>
                        <button 
                          onClick={() => updateQuantity(slot._id, getCartItemQuantity(slot._id) + 1)}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-r-md hover:bg-gray-200"
                          disabled={getCartItemQuantity(slot._id) >= slot.availableQuantity}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(slot._id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={slot.availableQuantity === 0}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealerCatalogPage; 