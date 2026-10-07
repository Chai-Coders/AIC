import React, { useEffect, useRef } from 'react';

/** Accessible modal built on <dialog>. Closes on Escape, backdrop click or the close button. */
const Modal = ({ open, onClose, label, className = '', children }) => {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <button type="button" className="dialog__close" aria-label="Close" onClick={onClose}>
            <i className="fa fa-times" aria-hidden="true" />
          </button>
          {children}
        </>
      )}
    </dialog>
  );
};

export default Modal;
