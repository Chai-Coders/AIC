import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message,
  itemCount = 1,
  itemDetails = null,
  isDeleting = false,
}) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-card-foreground"
      >
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 pr-6">
            <h3 id="modal-headline" className="text-lg font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Modal Body / Item Context */}
        <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-2 text-xs">
          <p className="text-foreground leading-relaxed">
            {message || (
              itemCount > 1
                ? `Are you sure you want to permanently delete these ${itemCount} selected items?`
                : 'Are you sure you want to permanently delete this item from the database?'
            )}
          </p>

          {itemDetails && (
            <div className="pt-2 border-t border-border/50 flex items-center gap-3">
              {itemDetails.image && (
                <img
                  src={itemDetails.image}
                  alt={itemDetails.title}
                  className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">
                  {itemDetails.title}
                </p>
                {itemDetails.tag && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Type: {itemDetails.tag}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-accent text-foreground text-xs font-medium transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold flex items-center gap-2 shadow-lg shadow-destructive/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {itemCount > 1 ? `Delete ${itemCount} Items` : 'Delete Permanently'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
