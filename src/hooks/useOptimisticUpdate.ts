import { useState, useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRollback?: (data: T) => void;
}

interface OptimisticUpdateResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  update: (updateFn: (data: T) => T, apiCall: () => Promise<T>) => Promise<void>;
  rollback: () => void;
}

export function useOptimisticUpdate<T>({
  onSuccess,
  onError,
  onRollback,
}: OptimisticUpdateOptions<T> = {}): OptimisticUpdateResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousData, setPreviousData] = useState<T | null>(null);

  const update = useCallback(
    async (updateFn: (data: T) => T, apiCall: () => Promise<T>) => {
      if (!data) {
        throw new Error('No data available for optimistic update');
      }

      setLoading(true);
      setError(null);
      setPreviousData(data);

      // Apply optimistic update
      const optimisticData = updateFn(data);
      setData(optimisticData);

      try {
        // Make API call
        const response = await apiCall();
        setData(response);
        onSuccess?.(response);
      } catch (err) {
        // Rollback on error
        setData(previousData);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        onRollback?.(previousData!);
      } finally {
        setLoading(false);
      }
    },
    [data, previousData, onSuccess, onError, onRollback]
  );

  const rollback = useCallback(() => {
    if (previousData) {
      setData(previousData);
      onRollback?.(previousData);
    }
  }, [previousData, onRollback]);

  return {
    data,
    loading,
    error,
    update,
    rollback,
  };
}

export default useOptimisticUpdate; 