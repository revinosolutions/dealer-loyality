import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

type ApiEndpoint = {
  getAll: () => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

type ApiService = {
  [K in keyof typeof apiService]: typeof apiService[K] extends ApiEndpoint ? K : never;
}[keyof typeof apiService];

interface UseDataFetchingOptions<T> {
  endpoint: ApiService;
  id?: string;
  initialData?: T;
  cacheTime?: number;
  autoFetch?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseDataFetchingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: () => void;
}

const cache = new Map<string, CacheItem<any>>();

export function useDataFetching<T extends object>({
  endpoint,
  id,
  initialData,
  cacheTime = 5 * 60 * 1000, // 5 minutes
  autoFetch = true,
  onSuccess,
  onError,
}: UseDataFetchingOptions<T>): UseDataFetchingResult<T> {
  const [data, setData] = useState<T | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = useRef(`${endpoint}${id ? `/${id}` : ''}`);

  const clearCache = useCallback(() => {
    cache.delete(cacheKey.current);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedItem = cache.get(cacheKey.current);
      const now = Date.now();

      if (cachedItem && now - cachedItem.timestamp < cacheTime) {
        setData(cachedItem.data);
        onSuccess?.(cachedItem.data);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const response = await (apiService[endpoint] as ApiEndpoint).getById(id || '') as T;
      setData(response);
      onSuccess?.(response);

      // Update cache
      cache.set(cacheKey.current, {
        data: response,
        timestamp: now,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [endpoint, id, cacheTime, onSuccess, onError]);

  const refreshData = useCallback(async () => {
    clearCache();
    await fetchData();
  }, [clearCache, fetchData]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    data,
    loading,
    error,
    fetchData,
    refreshData,
    clearCache,
  };
}

export default useDataFetching; 