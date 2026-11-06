import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// A yes / no dialog. `tone` picks the confirm button: 'primary' or 'danger'.
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  icon: Icon,
  title,
  message,
  confirmLabel,
  busyLabel = 'Working…',
  tone = 'primary',
  busy = false,
  children,
}) {
  const cancelButtonRef = useRef(null);

  // Focus the safe action when opened, and restore focus to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    cancelButtonRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const danger = tone === 'danger';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          {Icon && (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                danger ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <div id="confirm-message" className="text-sm leading-relaxed text-muted-foreground">
              {message}
            </div>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelButtonRef} type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? 'btn-danger' : 'btn-primary'}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
            <span>{busy ? busyLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
