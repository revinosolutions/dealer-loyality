import { useState, useCallback, useMemo } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface UsePaginationResult extends PaginationState {
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems = 0,
}: PaginationOptions = {}): UsePaginationResult {
  const [state, setState] = useState<PaginationState>({
    currentPage: initialPage,
    pageSize: initialPageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / initialPageSize),
  });

  const nextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.min(prev.currentPage + 1, prev.totalPages),
    }));
  }, []);

  const previousPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.max(prev.currentPage - 1, 1),
    }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.min(Math.max(1, page), prev.totalPages),
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      pageSize: size,
      totalPages: Math.ceil(prev.totalItems / size),
      currentPage: Math.min(prev.currentPage, Math.ceil(prev.totalItems / size)),
    }));
  }, []);

  const setTotalItems = useCallback((total: number) => {
    setState((prev) => ({
      ...prev,
      totalItems: total,
      totalPages: Math.ceil(total / prev.pageSize),
      currentPage: Math.min(prev.currentPage, Math.ceil(total / prev.pageSize)),
    }));
  }, []);

  const hasNextPage = useMemo(() => state.currentPage < state.totalPages, [state.currentPage, state.totalPages]);
  const hasPreviousPage = useMemo(() => state.currentPage > 1, [state.currentPage]);
  const startIndex = useMemo(() => (state.currentPage - 1) * state.pageSize + 1, [state.currentPage, state.pageSize]);
  const endIndex = useMemo(
    () => Math.min(state.currentPage * state.pageSize, state.totalItems),
    [state.currentPage, state.pageSize, state.totalItems]
  );

  return {
    ...state,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    setTotalItems,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
  };
}

export default usePagination; 