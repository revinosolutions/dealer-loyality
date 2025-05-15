import { useState, useCallback, useMemo } from 'react';

interface SearchConfig {
  keys: string[];
  threshold?: number;
  caseSensitive?: boolean;
}

interface UseSearchOptions {
  initialQuery?: string;
  config?: SearchConfig;
}

interface UseSearchResult<T> {
  query: string;
  results: T[];
  setQuery: (query: string) => void;
  clearSearch: () => void;
}

export function useSearch<T extends { [key: string]: any }>(
  items: T[],
  { initialQuery = '', config = { keys: [], threshold: 0.6, caseSensitive: false } }: UseSearchOptions = {}
): UseSearchResult<T> {
  const [query, setQuery] = useState(initialQuery);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const calculateSimilarity = useCallback(
    (str1: string, str2: string): number => {
      if (!config.caseSensitive) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
      }

      if (str1 === str2) return 1;
      if (str1.length === 0) return 0;
      if (str2.length === 0) return 0;

      const matrix: number[][] = [];

      for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str2.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }

      const maxLength = Math.max(str1.length, str2.length);
      return 1 - matrix[str1.length][str2.length] / maxLength;
    },
    [config.caseSensitive]
  );

  const searchItem = useCallback(
    (item: T): number => {
      if (!query) return 1;

      let maxSimilarity = 0;

      for (const key of config.keys) {
        const value = String(item[key] || '');
        const similarity = calculateSimilarity(query, value);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      return maxSimilarity;
    },
    [query, config.keys, calculateSimilarity]
  );

  const results = useMemo(() => {
    if (!query) return items;

    return items
      .map((item) => ({
        item,
        similarity: searchItem(item),
      }))
      .filter(({ similarity }) => similarity >= (config.threshold || 0))
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ item }) => item);
  }, [items, query, searchItem, config.threshold]);

  return {
    query,
    results,
    setQuery,
    clearSearch,
  };
}

export default useSearch; 