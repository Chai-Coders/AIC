import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const STYLES = {
  success: { Icon: CheckCircle2, color: 'text-success' },
  error: { Icon: AlertCircle, color: 'text-destructive' },
  warning: { Icon: AlertTriangle, color: 'text-warning' },
  info: { Icon: Info, color: 'text-primary' },
};

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      {toasts.map((toast) => {
        const { Icon, color } = STYLES[toast.type] || STYLES.info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
            <p className="flex-1 text-sm leading-snug break-words">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="icon-btn -m-1 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
