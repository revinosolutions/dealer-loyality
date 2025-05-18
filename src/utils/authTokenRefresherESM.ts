/**
 * Auth Token Refresher (ESM version)
 * This utility helps refresh the authentication token automatically
 */

import axios from 'axios';

// Flag to prevent multiple refresh attempts at the same time
let isRefreshing = false;
// Flag to track if an initial refresh has been attempted
let hasAttemptedInitialRefresh = false;
// Keep track of last refresh time to prevent too frequent refreshes
let lastRefreshTime = 0;
// Minimum interval between refresh attempts (5 seconds - reduced from 10)
const MIN_REFRESH_INTERVAL = 5000;

/**
 * Check token expiration and refresh if needed
 */
export const checkAndRefreshToken = async (): Promise<string | null> => {
  // Don't refresh too frequently - use a shorter interval for better reliability
  const now = Date.now();
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    console.log('Token was refreshed recently, skipping');
    return null;
  }
  
  // Prevent multiple refresh attempts
  if (isRefreshing) {
    console.log('Token refresh already in progress, skipping');
    return null;
  }
  
  try {
    isRefreshing = true;
    lastRefreshTime = now;
    
    // Get current token
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.log('No token found to refresh');
      return null;
    }

    // Call refresh token endpoint
    console.log('Attempting to refresh token...');
    
    // Try up to 3 times in case of network errors
    let attempts = 0;
    const maxAttempts = 3;
    let response = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        // Try multiple endpoints to increase chances of success
        try {
          // Try primary endpoint first
          response = await axios.post('/api/auth/refresh-token', {}, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'x-auth-token': currentToken
            },
            withCredentials: true, // Important for cookies
            // Add longer timeout for slower networks
            timeout: 15000
          });
        } catch (primaryErr) {
          console.warn('Primary refresh endpoint failed, trying alternate endpoint:', primaryErr);
          
          // If primary fails, try alternative endpoint
          response = await axios.post('/auth/refresh-token', {}, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'x-auth-token': currentToken
            },
            withCredentials: true,
            timeout: 15000
          });
        }
        
        // If we get a successful response, break out of the retry loop
        break;
      } catch (attemptError) {
        console.warn(`Token refresh attempt ${attempts} failed:`, attemptError);
        
        if (attempts >= maxAttempts) {
          // If we've reached max attempts, try direct fetch approach
          try {
            console.log('Trying direct fetch approach for token refresh...');
            const directResponse = await fetch('/api/auth/refresh-token', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${currentToken}`,
                'x-auth-token': currentToken
              },
              credentials: 'include'
            });
            
            if (directResponse.ok) {
              response = { data: await directResponse.json() };
              console.log('Direct fetch refresh succeeded:', response);
              break;
            } else {
              throw new Error(`Direct fetch failed: ${directResponse.status}`);
            }
          } catch (directErr) {
            console.error('Direct fetch approach also failed:', directErr);
            throw attemptError; // Rethrow original error
          }
        }
        
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Check if we got a new token
    if (response && response.data && response.data.token) {
      console.log('Token refreshed successfully');
      const newToken = response.data.token;
      
      // Store the new token
      localStorage.setItem('token', newToken);
      
      // Also update user data if available in the response
      if (response.data.user) {
        try {
          const userData = response.data.user;
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('User data updated with token refresh:', {
            id: userData.id,
            name: userData.name,
            role: userData.role
          });
        } catch (userErr) {
          console.warn('Failed to update user data:', userErr);
        }
      } else {
        // If no user data in response, try to fetch it separately
        // Try multiple endpoints
        try {
          console.log('Fetching user data after token refresh');
          let userResponse = null;
          
          try {
            // Try primary endpoint
            userResponse = await axios.get('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${newToken}`
              }
            });
          } catch (primaryUserErr) {
            console.warn('Primary user endpoint failed, trying alternate:', primaryUserErr);
            
            // Try alternate endpoint
            userResponse = await axios.get('/auth/me', {
              headers: {
                'Authorization': `Bearer ${newToken}`
              }
            });
          }
          
          if (userResponse && userResponse.data) {
            localStorage.setItem('user', JSON.stringify(userResponse.data));
            console.log('User data fetched separately after token refresh');
          }
        } catch (userFetchErr) {
          console.warn('Failed to fetch user data after token refresh:', userFetchErr);
        }
      }
      
      // Trigger an event to notify components about the token refresh
      try {
        window.dispatchEvent(new CustomEvent('auth-token-refreshed', { 
          detail: { success: true, timestamp: Date.now() }
        }));
      } catch (eventErr) {
        console.warn('Failed to dispatch token refresh event:', eventErr);
      }
      
      return newToken;
    } else {
      console.log('Token refresh response did not contain a token', response?.data);
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    // Detect specific error cases
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('Authentication failed during token refresh. User may need to login again.');
        // Don't clear token yet to allow direct API access attempts
        console.warn('Token is invalid but not clearing yet to allow direct API access attempts');
        
        // Dispatch auth warning event for components to respond
        try {
          window.dispatchEvent(new CustomEvent('auth-token-warning', {
            detail: { status: error.response?.status, timestamp: Date.now() }
          }));
        } catch (eventErr) {
          console.warn('Failed to dispatch auth warning event:', eventErr);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.warn('Token refresh timed out. Network may be slow or offline.');
      }
    }
    
    return null;
  } finally {
    // Clear refresh flag after a short delay to prevent immediate retries
    setTimeout(() => {
      isRefreshing = false;
    }, 2000);
  }
};

/**
 * Force a token refresh regardless of timing
 */
export const forceTokenRefresh = async (): Promise<string | null> => {
  // Reset timing restrictions
  lastRefreshTime = 0;
  // Clear refresh flag
  isRefreshing = false;
  // Call the refresh method
  return await checkAndRefreshToken();
};

/**
 * Initialize token refresh mechanism
 * Sets up periodic token refresh and initial check
 */
export const initializeTokenRefresh = (): void => {
  // Check token immediately
  setTimeout(async () => {
    if (!hasAttemptedInitialRefresh) {
      hasAttemptedInitialRefresh = true;
      try {
        await checkAndRefreshToken();
      } catch (err) {
        console.error('Initial token refresh failed:', err);
      }
    }
  }, 1000);
  
  // Set up periodic token refresh (every 5 minutes - more frequent than before)
  // Tokens typically last 15 minutes
  setInterval(async () => {
    try {
      await checkAndRefreshToken();
    } catch (err) {
      console.error('Periodic token refresh failed:', err);
    }
  }, 5 * 60 * 1000);
  
  // Add event listener for network status changes
  window.addEventListener('online', async () => {
    console.log('Network connection restored. Refreshing token...');
    await forceTokenRefresh();
  });
  
  // Listen for page visibility changes to refresh when user returns to the tab
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
      console.log('Page became visible. Checking token...');
      await checkAndRefreshToken();
    }
  });
};

export default {
  checkAndRefreshToken,
  forceTokenRefresh,
  initializeTokenRefresh
};
