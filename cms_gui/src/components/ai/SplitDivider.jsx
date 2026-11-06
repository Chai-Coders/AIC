import { useRef } from 'react';

// The bar between two panes, like Overleaf's: drag it, or use the arrow keys when
// it has focus. `value` is the width of the pane on its left.
export default function SplitDivider({ label, value, min, max, onChange }) {
  const start = useRef(null);
  const clamp = (n) => Math.round(Math.min(max, Math.max(min, n)));

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, value };
    document.body.classList.add('aic-dragging');
  };
  const onPointerMove = (e) => {
    if (start.current) onChange(clamp(start.current.value + e.clientX - start.current.x));
  };
  const onPointerUp = () => {
    start.current = null;
    document.body.classList.remove('aic-dragging');
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') onChange(clamp(value - 24));
    if (e.key === 'ArrowRight') onChange(clamp(value + 24));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group flex h-full w-2 shrink-0 cursor-col-resize touch-none items-center justify-center border-x border-border bg-muted transition-colors hover:bg-primary/20 focus-visible:bg-primary/30 focus-visible:outline-none"
    >
      <span className="h-8 w-0.5 rounded-full bg-muted-foreground/40 group-hover:bg-primary" aria-hidden="true" />
    </div>
  );
}
