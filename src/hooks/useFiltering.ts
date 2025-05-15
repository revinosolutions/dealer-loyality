import { useState, useCallback, useMemo } from 'react';

type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';

interface FilterConfig {
  key: string;
  value: any;
  operator: FilterOperator;
  secondValue?: any; // For 'between' operator
}

interface UseFilteringOptions {
  initialFilters?: FilterConfig[];
}

interface UseFilteringResult<T> {
  filters: FilterConfig[];
  filteredItems: T[];
  addFilter: (filter: FilterConfig) => void;
  removeFilter: (key: string) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
}

export function useFiltering<T extends { [key: string]: any }>(
  items: T[],
  { initialFilters = [] }: UseFilteringOptions = {}
): UseFilteringResult<T> {
  const [filters, setFilters] = useState<FilterConfig[]>(initialFilters);

  const addFilter = useCallback((filter: FilterConfig) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => prev.filter((filter) => filter.key !== key));
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters((prev) =>
      prev.map((filter) => (filter.key === key ? { ...filter, value } : filter))
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const applyFilter = useCallback(
    (item: T, filter: FilterConfig): boolean => {
      const itemValue = item[filter.key];
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'equals':
          return itemValue === filterValue;
        case 'contains':
          return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'startsWith':
          return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'endsWith':
          return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'greaterThan':
          return itemValue > filterValue;
        case 'lessThan':
          return itemValue < filterValue;
        case 'between':
          return itemValue >= filterValue && itemValue <= (filter.secondValue || filterValue);
        default:
          return true;
      }
    },
    []
  );

  const filteredItems = useMemo(() => {
    if (filters.length === 0) {
      return items;
    }

    return items.filter((item) =>
      filters.every((filter) => applyFilter(item, filter))
    );
  }, [items, filters, applyFilter]);

  return {
    filters,
    filteredItems,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
  };
}

export default useFiltering; 