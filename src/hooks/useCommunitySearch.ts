import { useState, useEffect, useCallback } from 'react';
import { findCompanions } from '@/lib/community';
import type { CompanionMatch, SearchFilters } from '@/types/community';

export function useCommunitySearch(initialFilters: SearchFilters = {}) {
  const [matches, setMatches] = useState<CompanionMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const search = useCallback(async (newFilters?: SearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const searchFilters = newFilters || filters;
      const results = await findCompanions(searchFilters);
      setMatches(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search for companions');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refresh = useCallback(() => {
    search();
  }, [search]);

  useEffect(() => {
    search();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [search, refresh]);

  const localMatches = matches.filter(m => m.match_type === 'local');
  const virtualMatches = matches.filter(m => m.match_type === 'virtual');

  return {
    matches,
    localMatches,
    virtualMatches,
    loading,
    error,
    filters,
    updateFilters,
    search,
    refresh,
  };
}
