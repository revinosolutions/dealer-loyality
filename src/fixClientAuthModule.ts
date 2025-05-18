/**
 * Client Authentication Fixer Module
 * 
 * This module helps diagnose and fix client authentication issues
 * by ensuring the token payload and user object in localStorage are
 * consistent with what the server expects.
 */

/**
 * Function to parse JWT token without using external libraries
 * @param {string} token - JWT token to decode
 * @returns {object} Decoded payload
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Main function to fix client authentication
 * @returns {boolean} Success or failure
 */
export function fixClientAuth(): boolean {
  console.log('🔒 Starting Client Authentication Fixer');
  
  try {
    // Get current token from localStorage
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.error('❌ No token found in localStorage! Please login again.');
      return false;
    }
    
    console.log('🔑 Found token in localStorage');
    
    // Decode the JWT token
    const decodedToken = decodeJwt(currentToken);
    if (!decodedToken) {
      console.error('❌ Failed to decode token! Token may be malformed.');
      return false;
    }
    
    console.log('📄 Decoded token payload:', decodedToken);
    
    // Get the current user object from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.error('❌ No user object found in localStorage! Please login again.');
      return false;
    }
    
    let user;
    try {
      user = JSON.parse(userStr);
      console.log('👤 Found user in localStorage:', {
        id: user.id,
        _id: user._id,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('❌ Failed to parse user object from localStorage!', error);
      return false;
    }
    
    // Check for authentication problems
    
    // Problem 1: Check if token has user.id vs id format discrepancy
    const hasDirectId = 'id' in decodedToken;
    const hasNestedId = decodedToken.user && 'id' in decodedToken.user;
    
    if (!hasDirectId && !hasNestedId) {
      console.error('❌ Token does not contain any user ID! This is a major issue.');
      return false;
    }
    
    console.log(`🔍 Token format check: Direct ID: ${hasDirectId}, Nested ID: ${hasNestedId}`);
    
    // Problem 2: Check if user object has _id and id correctly
    if (!user.id && !user._id) {
      console.error('❌ User object does not contain any ID! This is a major issue.');
      return false;
    }
    
    // Try to fix issues
    let fixed = false;
    
    // Fix user object by ensuring both id and _id are set
    if (user.id && !user._id) {
      console.log('🔧 Adding _id field to user object based on id');
      user._id = user.id;
      fixed = true;
    } else if (!user.id && user._id) {
      console.log('🔧 Adding id field to user object based on _id');
      user.id = user._id;
      fixed = true;
    }
    
    // Create clientId field if missing but needed
    if (user.role === 'client' && !user.clientId && (user.id || user._id)) {
      console.log('🔧 Adding clientId field to user object for client role');
      user.clientId = user.id || user._id;
      fixed = true;
    }
    
    // Save the updated user object
    if (fixed) {
      localStorage.setItem('user', JSON.stringify(user));
      console.log('✅ Fixed user object saved to localStorage');
    } else {
      console.log('ℹ️ No issues found in user object, no changes made');
    }
    
    // Add debugging info for API requests
    console.log('\nℹ️ Information for API requests:');
    console.log('User ID to use for requests:', user.id || user._id);
    console.log('Authorization header should be:', `Bearer ${currentToken}`);
    console.log('\nℹ️ After running this fix, please try refreshing the page or logging out and back in.');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during authentication fix:', error);
    return false;
  }
}

export default {
  fixClientAuth,
  decodeJwt
};
