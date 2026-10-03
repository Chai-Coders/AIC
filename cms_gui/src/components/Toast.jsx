import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 z-50 flex flex-col gap-2 sm:max-w-sm sm:w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        let bg = 'bg-card border-border text-foreground';
        let Icon = Info;

        if (toast.type === 'success') {
          bg = 'bg-card border-primary/40 text-foreground';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bg = 'bg-card border-destructive/50 text-foreground';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          bg = 'bg-card border-amber-500/50 text-foreground';
          Icon = AlertCircle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-3.5 shadow-xl backdrop-blur-lg flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in ${bg}`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                toast.type === 'success'
                  ? 'text-primary'
                  : toast.type === 'error'
                  ? 'text-destructive'
                  : toast.type === 'warning'
                  ? 'text-amber-500'
                  : 'text-foreground'
              }`}
            />
            <div className="text-xs flex-1 space-y-0.5">
              <p className="font-medium leading-tight break-words">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
