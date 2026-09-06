import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar, { ROUTES } from '../components/Sidebar';
import Toast from '../components/Toast';

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [multiSelect, setMultiSelect] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Find active route name based on current pathname
  const currentRouteMeta = ROUTES.find((r) => r.path === location.pathname) || null;

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Persistent Header */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeRouteName={currentRouteMeta?.name}
      />

      {/* Main Body Area: Collapsible Sidebar + Content Grid */}
      <div className="flex-1 flex w-full relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Dynamic Routed Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-[1720px] mx-auto w-full">
            <Outlet
              context={{
                multiSelect,
                setMultiSelect,
                showToast: addToast,
              }}
            />
          </div>
        </main>
      </div>

      {/* Global Toast Container */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
