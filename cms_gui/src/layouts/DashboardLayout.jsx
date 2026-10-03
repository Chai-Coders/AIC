import { useState, useCallback, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  // Only used on small screens; on desktop the menu is always visible.
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  // Close the slide-out menu with Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const outletContext = useMemo(() => ({ showToast: addToast }), [addToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <Sidebar isOpen={menuOpen} setIsOpen={setMenuOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
