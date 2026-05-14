import { ToastItem, type Toast } from './ToastItem';

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastList = ({ toasts, onDismiss }: Props) => (
  <div
    role="region"
    aria-label="Notifications"
    className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
  >
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);
