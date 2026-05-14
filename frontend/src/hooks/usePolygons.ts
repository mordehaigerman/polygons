import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  api,
  ensureOk,
  type AnyPolygon,
  type Polygon,
  type SavedPolygon,
} from '../api/client';
import { polygonsQueryKey } from '../lib/queryClient';

const CACHE_KEY = 'polygons:list-cache-v1';

const readCached = (): Polygon[] | undefined => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Polygon[]) : undefined;
  } catch {
    return undefined;
  }
};

const writeCached = (polygons: readonly AnyPolygon[]): void => {
  try {
    // Persist only server-confirmed polygons. In-flight pending drafts and
    // failed drafts are session-only -- a browser refresh clears them. The
    // transient `deleting` / `renaming` flags are stripped so a reload
    // mid-mutation shows the row in its normal state until the next fetch
    // resolves.
    const saved = polygons
      .filter((p): p is SavedPolygon => typeof p.id === 'number')
      .map(({ deleting: _d, renaming: _r, ...rest }) => rest as Polygon);
    localStorage.setItem(CACHE_KEY, JSON.stringify(saved));
  } catch {
    // localStorage may be disabled or quota-exceeded; failing silently here is
    // safe because the cache is purely an offline-hint, never a source of truth.
  }
};

/**
 * Fetches the polygon list, seeding the cache from localStorage so a reload
 * shows the last-known list immediately while the network round-trip runs in
 * the background. The backend always wins once it responds.
 */
export const usePolygons = () => {
  const query = useQuery<Polygon[]>({
    queryKey: polygonsQueryKey,
    queryFn: async () => {
      const result = await api.GET('/api/polygons');
      return ensureOk(result, 'Failed to load polygons') ?? [];
    },
    initialData: readCached,
    // Treat the cached value as already-stale so React Query refetches on
    // mount even when initialData is supplied.
    initialDataUpdatedAt: 0,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      writeCached(query.data);
    }
  }, [query.isSuccess, query.data]);

  return query;
};
