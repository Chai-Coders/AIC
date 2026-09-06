import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Sidebar, { ROUTES } from './components/Sidebar';
import ContentGrid from './components/ContentGrid';
import HomeView from './components/HomeView';
import Toast from './components/Toast';
import { Loader2, Sparkles } from 'lucide-react';

function CMSApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeRoute, setActiveRoute] = useState('home');
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

  // Find active route metadata
  const currentRouteMeta = ROUTES.find((r) => r.id === activeRoute) || ROUTES[0];

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Connecting to CMS Studio...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Header matching wireframe (Logo 1, Logo 2, Multi-select, Theme Switch) */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        multiSelect={multiSelect}
        setMultiSelect={setMultiSelect}
        activeRouteName={currentRouteMeta.name}
      />

      {/* Main Body Area: Collapsible Sidebar + Content Grid */}
      <div className="flex-1 flex w-full relative">
        {/* Collapsible Sidebar (Navbar) */}
        <Sidebar
          activeRoute={activeRoute}
          setActiveRoute={setActiveRoute}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeRoute === 'home' ? (
              <HomeView
                onOpenSidebar={() => setSidebarOpen(true)}
                onSelectRoute={(routeId) => setActiveRoute(routeId)}
              />
            ) : (
              <ContentGrid
                routeId={currentRouteMeta.id}
                routeName={currentRouteMeta.name}
                endpointUrl={currentRouteMeta.endpoint}
                multiSelect={multiSelect}
                setMultiSelect={setMultiSelect}
                showToast={addToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Toast Container */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CMSApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
