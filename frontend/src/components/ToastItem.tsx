import { useEffect } from 'react';

const AUTO_DISMISS_MS = 5_000;

export interface Toast {
  id: string;
  message: string;
  tone: 'error' | 'info' | 'success';
}

interface Props {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TONE_CLASSES: Record<Toast['tone'], string> = {
  error: 'bg-rose-500/15 text-rose-100 ring-rose-400/40',
  success: 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/40',
  info: 'bg-slate-800/90 text-slate-100 ring-slate-600/40',
};

export const ToastItem = ({ toast, onDismiss }: Props) => {
  useEffect(() => {
    const handle = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(handle);
  }, [toast.id, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto min-w-64 max-w-sm rounded-md px-4 py-2 text-sm shadow-lg ring-1 ${TONE_CLASSES[toast.tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
          className="cursor-pointer text-slate-400 hover:text-slate-100"
        >
          ×
        </button>
      </div>
    </div>
  );
};
