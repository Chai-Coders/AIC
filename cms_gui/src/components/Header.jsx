import { Menu } from 'lucide-react';

// Top bar shown only on phones and small tablets, where the menu is hidden.
export default function Header({ onOpenMenu }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
      <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="icon-btn -ml-2">
        <Menu className="h-5 w-5" />
      </button>
      <img src="/logo1.png" alt="AIC IIITK" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
    </header>
  );
}
