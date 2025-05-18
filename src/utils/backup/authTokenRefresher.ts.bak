/**
 * Auth Token Refresher
 * This utility helps refresh the authentication token automatically
 */

import axios from 'axios';

// Flag to prevent multiple refresh attempts at the same time
let isRefreshing = false;
// Flag to track if an initial refresh has been attempted
let hasAttemptedInitialRefresh = false;

/**
 * Check token expiration and refresh if needed
 */
export async function checkAndRefreshToken(): Promise<string | null> {
  // Prevent multiple refresh attempts
  if (isRefreshing) {
    console.log('Token refresh already in progress, skipping');
    return null;
  }
  
  try {
    isRefreshing = true;
    
    // Get current token
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.log('No token found to refresh');
      return null;
    }
    
    console.log('Attempting to refresh auth token');
    
    // Make refresh token request
    const response = await axios.post('/api/auth/refresh-token', {}, {
      withCredentials: true, // Important for cookies
    });
    
    if (response.data && response.data.token) {
      console.log('Token refreshed successfully');
      localStorage.setItem('token', response.data.token);
      
      // Update user data if available
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data.token;
    } else {
      console.warn('Token refresh response did not contain a token');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Initialize automatic token refresh on page load
 */
export function initializeTokenRefresh() {
  // Only attempt once per page load
  if (hasAttemptedInitialRefresh) {
    return;
  }
  
  hasAttemptedInitialRefresh = true;
  
  // Check for token on page load
  const token = localStorage.getItem('token');
  if (token) {
    console.log('Token found on page load, checking validity');
    checkAndRefreshToken();
  }
  
  // Set up refresh interval (every 15 minutes)
  setInterval(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      checkAndRefreshToken();
    }
  }, 15 * 60 * 1000); // 15 minutes
}
