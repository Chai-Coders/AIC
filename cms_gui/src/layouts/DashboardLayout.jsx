import { useState, useCallback, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  // Sidebar is an overlay on phones, so start collapsed there.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia('(max-width: 767px)').matches
  );
  const [toasts, setToasts] = useState([]);

  // Multi-select is per page: it is stored with the path it was enabled on, so
  // navigating elsewhere turns it off without any reset step.
  const [multiSelectPath, setMultiSelectPath] = useState(null);
  const multiSelect = multiSelectPath === location.pathname;
  const setMultiSelect = useCallback((next) => {
    const path = location.pathname;
    setMultiSelectPath((prevPath) => {
      const enabled = typeof next === 'function' ? next(prevPath === path) : next;
      return enabled ? path : null;
    });
  }, [location.pathname]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  // Close the mobile sidebar overlay with Escape.
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && window.matchMedia('(max-width: 767px)').matches) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const outletContext = useMemo(
    () => ({ multiSelect, setMultiSelect, showToast: addToast }),
    [multiSelect, setMultiSelect, addToast]
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Persistent Header */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Body Area: Collapsible Sidebar + Content Grid */}
      <div className="flex-1 flex w-full relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Dynamic Routed Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1720px] mx-auto w-full">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      {/* Global Toast Container */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
