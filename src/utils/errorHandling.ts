/**
 * Utility functions for consistent error handling across the application
 */

/**
 * Format error message from various error types
 * @param error The error object
 * @returns Formatted error message string
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
};

/**
 * Retry a function with exponential backoff
 * @param fn The async function to retry
 * @param retries Number of retries
 * @param delay Initial delay in ms
 * @param backoff Backoff factor
 * @returns Promise with the function result
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 300,
  backoff = 2
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return retryWithBackoff(fn, retries - 1, delay * backoff, backoff);
  }
};

/**
 * Create a timeout promise that rejects after specified time
 * @param ms Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
};

/**
 * Execute a promise with a timeout
 * @param promise The promise to execute
 * @param ms Timeout in milliseconds
 * @returns Promise with race between original promise and timeout
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([promise, createTimeout(ms)]);
};