import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-card border-border text-foreground';
        let Icon = Info;

        if (toast.type === 'success') {
          bg = 'bg-card border-primary/40 text-foreground';
          Icon = CheckCircle2;
        } else if (toast.type === 'error' || toast.type === 'warning') {
          bg = 'bg-destructive/15 border-destructive/40 text-foreground';
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
                  : 'text-foreground'
              }`}
            />
            <div className="text-xs flex-1 space-y-0.5">
              <p className="font-medium leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
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
