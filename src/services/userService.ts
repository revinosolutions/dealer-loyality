import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface UserData {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
  clientId?: string;
  organizationId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  company?: {
    name?: string;
    position?: string;
    website?: string;
    address?: string;
  };
  createdByClient?: boolean;
  password?: string;
}

/**
 * Create a new dealer account using the specific dealer endpoint
 * @param dealerData The dealer data to create
 * @returns The created dealer
 */
export const createDealer = async (dealerData: UserData): Promise<UserData> => {
  try {
    // Get authentication token from localStorage
    let token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make sure token has Bearer prefix
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    // Get the current user to log who's creating the dealer
    const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    console.log('Creating dealer as user:', currentUser ? {
      id: currentUser.id,
      role: currentUser.role,
      organizationId: currentUser.organizationId || (currentUser.organization && currentUser.organization.id)
    } : 'No user found');

    // Ensure organizationId is properly set
    if (!dealerData.organizationId && currentUser) {
      dealerData.organizationId = currentUser.organizationId || 
                                 (currentUser.organization && currentUser.organization.id);
      console.log('Updated organizationId to:', dealerData.organizationId);
    }

    // Ensure clientId is properly set
    if (!dealerData.clientId && currentUser) {
      dealerData.clientId = currentUser.id;
      console.log('Updated clientId to:', dealerData.clientId);
    }

    // More detailed logging
    console.log('Creating dealer with data:', {
      name: dealerData.name,
      email: dealerData.email,
      role: dealerData.role,
      clientId: dealerData.clientId,
      organizationId: dealerData.organizationId,
      createdByClient: dealerData.createdByClient
    });

    // Use the dedicated dealer endpoint with proper authentication
    console.log('Creating dealer using dedicated dealer endpoint');
    const response = await axios.post(`${API_BASE_URL}/dealers`, {
      ...dealerData,
      role: 'dealer',
      createdByClient: true
    }, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Dealer created successfully');
    return response.data;
  } catch (error: any) {
    // Enhanced error logging
    console.error('Error creating dealer:', error.response?.status, error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
      
      // Provide more specific error messages based on status codes
      if (error.response.status === 403) {
        throw new Error('Permission denied. You do not have sufficient privileges to create dealers.');
      } else if (error.response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response.status === 400) {
        const errorMessage = error.response.data.message || 'Invalid dealer data provided.';
        throw new Error(errorMessage);
      }
    }
    
    // General error if no specific status code handling
    throw new Error('Failed to create dealer: ' + (error.response?.data?.message || error.message));
  }
};

/**
 * Get all dealers for the current client
 * @returns List of dealers
 */
export const getClientDealers = async (): Promise<UserData[]> => {
  try {
    // Get authentication token
    let token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make sure token has Bearer prefix
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }

    // Use the new dedicated dealer endpoint
    console.log('Fetching dealers using dedicated dealer endpoint');
    const response = await axios.get(`${API_BASE_URL}/dealers`, {
      headers: {
        'Authorization': token
      }
    });
    
    return Array.isArray(response.data) ? response.data : 
           (response.data.dealers || []);
  } catch (error: any) {
    console.error('Error fetching dealers:', error.response?.data || error.message);
    
    // Fall back to the general users endpoint if the dedicated endpoint fails
    try {
      // Get authentication token again
      let token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Make sure token has Bearer prefix
      if (!token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }

      console.warn('Dealer-specific endpoint failed, falling back to general users endpoint');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const clientId = user.id || user._id;
      
      if (!clientId) {
        throw new Error('Client ID not found in local storage');
      }
      
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: {
          role: 'dealer',
          clientId: clientId
        },
        headers: {
          'Authorization': token
        }
      });
      
      return Array.isArray(response.data) ? response.data : 
             (response.data.users || []);
    } catch (fallbackError: any) {
      console.error('Error fetching dealers with fallback method:', fallbackError.response?.data || fallbackError.message);
      throw new Error(fallbackError.response?.data?.message || 'Failed to fetch dealers');
    }
  }
};

/**
 * Update an existing dealer
 * @param id Dealer ID
 * @param dealerData Updated dealer data
 * @returns The updated dealer
 */
export const updateDealer = async (id: string, dealerData: Partial<UserData>): Promise<UserData> => {
  try {
    // Get authentication token
    let token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make sure token has Bearer prefix
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }

    // Use the new dedicated dealer endpoint
    console.log('Updating dealer using dedicated dealer endpoint');
    const response = await axios.put(`${API_BASE_URL}/dealers/${id}`, dealerData, {
      headers: {
        'Authorization': token
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating dealer:', error.response?.data || error.message);
    
    // Fall back to the general users endpoint if the dedicated endpoint fails
    try {
      // Get authentication token again
      let token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Make sure token has Bearer prefix
      if (!token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }

      console.warn('Dealer-specific endpoint failed, falling back to general users endpoint');
      const response = await axios.put(`${API_BASE_URL}/users/${id}`, dealerData, {
        headers: {
          'Authorization': token
        }
      });
      return response.data.user || response.data;
    } catch (fallbackError: any) {
      console.error('Error updating dealer with fallback method:', fallbackError.response?.data || fallbackError.message);
      throw new Error(fallbackError.response?.data?.message || 'Failed to update dealer');
    }
  }
};

/**
 * Delete a dealer
 * @param id Dealer ID
 * @returns Success message
 */
export const deleteDealer = async (id: string): Promise<{ message: string }> => {
  try {
    // Get authentication token
    let token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make sure token has Bearer prefix
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }

    // Use the new dedicated dealer endpoint
    console.log('Deleting dealer using dedicated dealer endpoint');
    const response = await axios.delete(`${API_BASE_URL}/dealers/${id}`, {
      headers: {
        'Authorization': token
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting dealer:', error.response?.data || error.message);
    
    // Fall back to the general users endpoint if the dedicated endpoint fails
    try {
      // Get authentication token again
      let token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Make sure token has Bearer prefix
      if (!token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }

      console.warn('Dealer-specific endpoint failed, falling back to general users endpoint');
      const response = await axios.delete(`${API_BASE_URL}/users/${id}`, {
        headers: {
          'Authorization': token
        }
      });
      return response.data;
    } catch (fallbackError: any) {
      console.error('Error deleting dealer with fallback method:', fallbackError.response?.data || fallbackError.message);
      throw new Error(fallbackError.response?.data?.message || 'Failed to delete dealer');
    }
  }
};

/**
 * Check if a dealer account exists and can login
 * @param email Dealer email
 * @returns Boolean indicating if dealer exists and is active
 */
export const checkDealerExists = async (email: string): Promise<boolean> => {
  try {
    // Get authentication token
    let token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make sure token has Bearer prefix
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }

    const response = await axios.post(`${API_BASE_URL}/auth/check-user`, { email }, {
      headers: {
        'Authorization': token
      }
    });
    return response.data.exists && response.data.role === 'dealer' && response.data.status === 'active';
  } catch (error: any) {
    console.error('Error checking dealer:', error.response?.data || error.message);
    return false;
  }
};

export default {
  createDealer,
  getClientDealers,
  updateDealer,
  deleteDealer,
  checkDealerExists
};