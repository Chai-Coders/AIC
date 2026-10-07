import React, { useCallback, useEffect, useRef } from 'react';
import { cdnImage } from '../../lib/image';

/**
 * Full-screen image viewer built on <dialog>.
 * @param {{ items: {id, image, subtext}[], index: number|null, onChange: (i: number|null) => void }} props
 */
const Lightbox = ({ items, index, onChange }) => {
  const dialogRef = useRef(null);
  const open = index !== null && items[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const go = useCallback(
    (delta) => onChange((index + delta + items.length) % items.length),
    [index, items.length, onChange]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  const item = open ? items[index] : null;

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label="Image viewer"
      onClose={() => onChange(null)}
      onClick={(e) => {
        if (e.target === dialogRef.current) onChange(null);
      }}
    >
      {item && (
        <>
          <button type="button" className="lightbox__btn lightbox__close" aria-label="Close" onClick={() => onChange(null)}>
            <i className="fa fa-times" aria-hidden="true" />
          </button>
          {items.length > 1 && (
            <>
              <button type="button" className="lightbox__btn lightbox__prev" aria-label="Previous image" onClick={() => go(-1)}>
                <i className="fa fa-angle-left" aria-hidden="true" />
              </button>
              <button type="button" className="lightbox__btn lightbox__next" aria-label="Next image" onClick={() => go(1)}>
                <i className="fa fa-angle-right" aria-hidden="true" />
              </button>
            </>
          )}
          <figure className="lightbox__figure">
            <img key={item.id} src={cdnImage(item.image, 1920)} alt={item.subtext || 'Gallery image'} />
            <figcaption>
              {item.subtext && <span>{item.subtext}</span>}
              <span className="lightbox__count">
                {index + 1} / {items.length}
              </span>
            </figcaption>
          </figure>
        </>
      )}
    </dialog>
  );
};

export default Lightbox;
