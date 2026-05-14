import { useCallback, useState } from 'react';
import { type Toast } from '../components/ToastItem';

let toastCounter = 0;
const nextToastId = (): string => `t-${++toastCounter}`;

interface UseToasts {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToasts = (): UseToasts => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    setToasts((current) => [...current, { ...toast, id: nextToastId() }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
};
