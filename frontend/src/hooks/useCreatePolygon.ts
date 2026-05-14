import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  api,
  ensureOk,
  type AnyPolygon,
  type DraftPolygon,
  type Polygon,
  type PolygonInput,
} from '../api/client';
import { polygonsQueryKey } from '../lib/queryClient';

/**
 * Variables for the create mutation. `retryId` is the cache id of an existing
 * failed draft -- when present we flip that draft back to "pending" in place
 * (so its row doesn't jump to the bottom of the list) instead of appending a
 * brand-new pending draft.
 */
export interface CreatePolygonVars extends PolygonInput {
  retryId?: string;
}

/**
 * Caller-side side-effects, fired from the hook's *central* lifecycle so they
 * run once per completed mutation -- including concurrent ones. The per-call
 * options on `mutate()` only fire for the latest call (a React Query quirk),
 * which is why callers should pass toast / navigation logic here instead.
 */
export interface CreatePolygonCallbacks {
  onSuccess?: (created: Polygon, vars: CreatePolygonVars) => void;
  onError?: (err: Error, vars: CreatePolygonVars) => void;
}

interface Context {
  tempId: string;
}

let draftCounter = 0;
const nextDraftId = (): string => `tmp-${++draftCounter}`;

export const useCreatePolygon = (callbacks: CreatePolygonCallbacks = {}) => {
  const queryClient = useQueryClient();
  // Stash the latest callbacks in a ref so the mutation config (frozen on
  // first render) always reaches the current closure -- avoids stale-name
  // captures without invalidating the mutation observer.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  return useMutation<Polygon, Error, CreatePolygonVars, Context>({
    mutationFn: async ({ name, points }) => {
      const fallback = `Failed to save "${name}"`;
      const result = await api.POST('/api/polygons', { body: { name, points } });
      const data = ensureOk(result, fallback);
      if (!data) {
        // 2xx with no parseable body -- shouldn't happen against our backend.
        throw new Error(fallback);
      }
      return data;
    },
    onMutate: async ({ name, points, retryId }) => {
      await queryClient.cancelQueries({ queryKey: polygonsQueryKey });
      const tempId = retryId ?? nextDraftId();
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) => {
        const list = current ?? [];
        if (retryId !== undefined) {
          // In-place flip: failed -> pending, preserving position.
          return list.map((p) =>
            p.id === retryId ? { ...(p as DraftPolygon), status: 'pending' } : p,
          );
        }
        // Fresh draft: append.
        const draft: DraftPolygon = { id: tempId, name, points, status: 'pending' };
        return [...list, draft];
      });
      return { tempId };
    },
    onError: (err, vars, ctx) => {
      // Keep the draft visible in place but flip it to "failed" so the user
      // can hit Retry. No rollback, no invalidation.
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).map((p) =>
          p.id === ctx?.tempId ? { ...(p as DraftPolygon), status: 'failed' } : p,
        ),
      );
      callbacksRef.current.onError?.(err, vars);
    },
    onSuccess: (created, vars, ctx) => {
      // Replace the draft with the server-confirmed polygon at the same index.
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).map((p) => (p.id === ctx?.tempId ? created : p)),
      );
      callbacksRef.current.onSuccess?.(created, vars);
    },
    // Intentionally no onSettled invalidate: optimistic updates are the source
    // of truth here. Refetching would clobber any in-cache failed drafts.
  });
};
