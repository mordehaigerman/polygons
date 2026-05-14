import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { api, ensureOk, isDraft, type AnyPolygon, type Polygon } from '../api/client';
import { polygonsQueryKey } from '../lib/queryClient';

interface Variables {
  id: number;
  name: string;
}

/**
 * Caller-side side-effects, fired from the hook's *central* lifecycle so they
 * run once per completed mutation -- including concurrent ones. Per-call
 * options on `mutate()` only fire for the latest call.
 */
export interface RenamePolygonCallbacks {
  onSuccess?: (vars: Variables) => void;
  onError?: (err: Error, vars: Variables) => void;
}

interface Context {
  previousName?: string;
}

/**
 * Optimistic rename with a visible *renaming* state. The row immediately
 * shows the new name with a "Renaming" badge (mirroring the saving / deleting
 * patterns), then the badge clears on success or the name reverts in-place on
 * error -- never a full snapshot rollback, which would clobber any other
 * optimistic state that landed during the round trip.
 *
 * Rename only changes metadata, so the canvas polygon keeps its color and
 * shape throughout (only the centroid label updates).
 */
export const useRenamePolygon = (callbacks: RenamePolygonCallbacks = {}) => {
  const queryClient = useQueryClient();
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  return useMutation<void, Error, Variables, Context>({
    mutationFn: async ({ id, name }) => {
      const result = await api.PATCH('/api/polygons/{polygon_id}', {
        params: { path: { polygon_id: id } },
        body: { name },
      });
      ensureOk(result, 'Failed to rename polygon');
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: polygonsQueryKey });
      // Capture the previous name so onError can revert in place without
      // touching unrelated rows. Drafts can't be renamed (they have string
      // ids and no server identity yet), so a missing match is a no-op.
      const current = queryClient.getQueryData<AnyPolygon[]>(polygonsQueryKey);
      const target = current?.find((p) => !isDraft(p) && p.id === id);
      const previousName = target && !isDraft(target) ? target.name : undefined;
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (currentList) =>
        (currentList ?? []).map((p) =>
          !isDraft(p) && p.id === id ? { ...p, name, renaming: true as const } : p,
        ),
      );
      return { previousName };
    },
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).map((p) => {
          if (isDraft(p) || p.id !== vars.id) {
            return p;
          }
          const { renaming: _omitted, ...rest } = p;
          return rest as Polygon;
        }),
      );
      callbacksRef.current.onSuccess?.(vars);
    },
    onError: (err, vars, ctx) => {
      queryClient.setQueryData<AnyPolygon[]>(polygonsQueryKey, (current) =>
        (current ?? []).map((p) => {
          if (isDraft(p) || p.id !== vars.id) {
            return p;
          }
          const { renaming: _omitted, ...rest } = p;
          const reverted: Polygon
            = ctx?.previousName !== undefined ? { ...rest, name: ctx.previousName } : rest;
          return reverted;
        }),
      );
      callbacksRef.current.onError?.(err, vars);
    },
  });
};
