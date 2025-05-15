import { useState, useCallback } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface UseSortingOptions {
  initialKey?: string;
  initialDirection?: SortDirection;
}

interface UseSortingResult<T> {
  sortConfig: SortConfig;
  sortedItems: T[];
  requestSort: (key: string) => void;
}

export function useSorting<T extends { [key: string]: any }>(
  items: T[],
  { initialKey, initialDirection = 'asc' }: UseSortingOptions = {}
): UseSortingResult<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: initialKey || '',
    direction: initialDirection,
  });

  const requestSort = useCallback(
    (key: string) => {
      setSortConfig((prevConfig) => {
        if (prevConfig.key === key) {
          return {
            key,
            direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
          };
        }
        return {
          key,
          direction: 'asc',
        };
      });
    },
    []
  );

  const sortedItems = useCallback(() => {
    if (!sortConfig.key) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) {
        return 0;
      }

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  return {
    sortConfig,
    sortedItems: sortedItems(),
    requestSort,
  };
}

export default useSorting; 