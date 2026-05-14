import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { api, ensureOk, isDraft, type AnyPolygon, type Polygon } from '../api/client';
import { polygonsQueryKey } from '../lib/queryClient';

/**
 * Caller-side side-effects, fired from the hook's *central* lifecycle so they
 * run once per completed mutation -- including concurrent ones. The polygon's
 * captured name (looked up at onMutate time) flows through so the success
 * toast can reference it even after the row is gone from the cache.
 */
export interface DeletePolygonCallbacks {
  onSuccess?: (polygonId: number, name: string) => void;
  onError?: (err: Error, polygonId: number) => void;
}

interface Context {
  name: string;
}

/**
 * Optimistic delete with a visible *deleting* state -- the row stays in the
 * list (and on the canvas) grayed out until the server confirms removal,
 * matching the *saving* state used by `useCreatePolygon`. On error the
 * `deleting` flag is cleared in place so the row pops back to its normal
 * color without losing its position.
 */
export const useDeletePolygon = (callbacks: DeletePolygonCallbacks = {}) => {
  const queryClient = useQueryClient();
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  return useMutation<void, Error, number, Context>({
    mutationFn: async (polygonId) => {
      const result = await api.DELETE('/api/polygons/{polygon_id}', {
        params: { path: { polygon_id: polygonId } },
      });
      ensureOk(result, 'Failed to delete polygon');
    },
    onMutate: async (polygonId) => {
      await queryClient.cancelQueries({ queryKey: polygonsQueryKey });
      // Snapshot the name *before* the optimistic update -- after onMutate
      // the row is grayed and the success toast still needs to say what got
      // removed. Drafts have string ids; we only ever delete real polygons.
      const current = queryClient.getQueryData<AnyPolygon[]>(polygonsQueryKey);
      const target = current?.find((p) => !isDraft(p) && p.id === polygonId);
      const name = target && !isDraft(target) ? target.name : `polygon ${polygonId}`;
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (currentList) =>
        (currentList ?? []).map((p) =>
          !isDraft(p) && p.id === polygonId ? { ...p, deleting: true as const } : p,
        ),
      );
      return { name };
    },
    onSuccess: (_data, polygonId, ctx) => {
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).filter((p) => p.id !== polygonId),
      );
      callbacksRef.current.onSuccess?.(polygonId, ctx?.name ?? `polygon ${polygonId}`);
    },
    onError: (err, polygonId) => {
      // Strip the `deleting` flag in place so the row returns to its normal
      // styling. Snapshot rollback would also work, but it would clobber any
      // other optimistic state (in-flight creates, failed drafts) that landed
      // during the round trip.
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).map((p) => {
          if (isDraft(p) || p.id !== polygonId) {
            return p;
          }
          const { deleting: _omitted, ...rest } = p;
          return rest as Polygon;
        }),
      );
      callbacksRef.current.onError?.(err, polygonId);
    },
  });
};
