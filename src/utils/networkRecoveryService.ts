/**
 * Network Recovery Service
 * Handles network connection issues and authentication recovery
 */

import { checkAndRefreshToken } from './authTokenRefresherESM';
import { fixClientAuth } from '../fixClientAuthModule';

/**
 * Checks for common network errors and attempts to recover
 * @returns {Promise<boolean>} True if recovery was attempted
 */
export async function checkAndRecoverFromNetworkErrors(): Promise<boolean> {
  console.log('🔄 Checking for network errors and attempting recovery...');
  
  try {
    // Check for common network error patterns in console
    if (hasRecentNetworkError()) {
      console.log('🔍 Detected recent network error, attempting recovery...');
      
      // Step 1: Try to refresh the token
      try {
        console.log('🔄 Attempting token refresh...');
        await checkAndRefreshToken();
        console.log('✅ Token refresh completed');
      } catch (tokenErr) {
        console.warn('⚠️ Token refresh failed:', tokenErr);
      }
      
      // Step 2: Fix client authentication issues
      try {
        console.log('🔧 Running client auth fix...');
        const fixResult = fixClientAuth();
        console.log('🔧 Auth fix result:', fixResult ? 'Success' : 'Failed');
      } catch (authErr) {
        console.warn('⚠️ Auth fix failed:', authErr);
      }
      
      // Step 3: Test network connectivity
      try {
        console.log('🌐 Testing API connectivity...');
        await fetch('/api/health-check', { method: 'GET' }).catch(() => {
          console.log('🔄 Using backup health check endpoint...');
          return fetch('/api', { method: 'OPTIONS' });
        });
        console.log('✅ Network connectivity confirmed');
      } catch (netErr) {
        console.error('❌ Network test failed:', netErr);
      }
      
      return true; // Recovery was attempted
    } else {
      console.log('✅ No recent network errors detected');
      return false;
    }
  } catch (err) {
    console.error('❌ Error during network recovery:', err);
    return false;
  }
}

/**
 * Check if there's a recent network error in console logs
 */
function hasRecentNetworkError(): boolean {
  // This is a simplified heuristic - in a real app you'd check actual logs or status
  const recentErrors = window.sessionStorage.getItem('recent_network_errors');
  if (recentErrors) {
    const errorCount = parseInt(recentErrors, 10);
    return errorCount > 0;
  }
  return false;
}

/**
 * Record a network error to help with detecting patterns
 */
export function recordNetworkError(error: any): void {
  const currentCount = parseInt(window.sessionStorage.getItem('recent_network_errors') || '0', 10);
  window.sessionStorage.setItem('recent_network_errors', String(currentCount + 1));
  
  // Auto-reset counter after 5 minutes to avoid false positives
  setTimeout(() => {
    const newCount = parseInt(window.sessionStorage.getItem('recent_network_errors') || '0', 10);
    if (newCount > 0) {
      window.sessionStorage.setItem('recent_network_errors', String(newCount - 1));
    }
  }, 5 * 60 * 1000);
}

export default {
  checkAndRecoverFromNetworkErrors,
  recordNetworkError
};
