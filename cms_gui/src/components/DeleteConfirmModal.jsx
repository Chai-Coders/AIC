import { useEffect, useRef } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete this item?',
  message,
  confirmLabel = 'Delete',
  itemDetails = null,
  isDeleting = false,
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

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-message"
        className="w-full max-w-md rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id="delete-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p id="delete-message" className="text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        {itemDetails && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            {itemDetails.image && (
              <img
                src={itemDetails.image}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
              />
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{itemDetails.title}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelButtonRef} type="button" onClick={onClose} disabled={isDeleting} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isDeleting} className="btn-danger">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span>{isDeleting ? 'Deleting…' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
