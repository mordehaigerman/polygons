import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Toast } from '../components/ToastItem';

const POLL_INTERVAL_MS = 5_000;

type Status = 'connected' | 'disconnected';
type PushToast = (toast: Omit<Toast, 'id'>) => void;

/**
 * Polls the backend `/health` endpoint and pushes a toast on every
 * connected ↔ disconnected transition. Silent on the very first "connected"
 * result so a fresh page load doesn't show a "restored" toast.
 *
 * Status is derived from `dataUpdatedAt` vs `errorUpdatedAt` rather than the
 * boolean flags: a streak of failures keeps `isError` stable but advances
 * `errorUpdatedAt`, and we only care about the *latest* outcome.
 */
export const useServerHealth = (push: PushToast): void => {
  const lastRef = useRef<Status | null>(null);

  const { dataUpdatedAt, errorUpdatedAt } = useQuery({
    queryKey: ['server-health'],
    queryFn: async () => {
      const result = await api.GET('/health');
      if (!result.response.ok) {
        throw new Error('Server unreachable');
      }
      return result.data;
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const status: Status | null
    = dataUpdatedAt === 0 && errorUpdatedAt === 0
      ? null
      : dataUpdatedAt > errorUpdatedAt
        ? 'connected'
        : 'disconnected';

  useEffect(() => {
    if (status === null) {
      return;
    }
    const prev = lastRef.current;
    if (prev === status) {
      return;
    }
    if (prev === null) {
      // First settle of the session: only announce a problem; a successful
      // probe is the assumed default.
      if (status === 'disconnected') {
        push({ message: 'Lost connection to the server. Retrying…', tone: 'error' });
      }
    } else if (status === 'connected') {
      push({ message: 'Reconnected to the server', tone: 'success' });
    } else {
      push({ message: 'Lost connection to the server. Retrying…', tone: 'error' });
    }
    lastRef.current = status;
  }, [status, push]);
};
