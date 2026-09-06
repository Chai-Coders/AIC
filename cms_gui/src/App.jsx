import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import GalleryPage from './pages/GalleryPage';
import StartupsPage from './pages/StartupsPage';
import NewsPage from './pages/NewsPage';
import TeamPage from './pages/TeamPage';
import LoginPage from './components/LoginPage';
import { Loader2, Sparkles } from 'lucide-react';

function AuthLoader({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary animate-pulse shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Connecting to CMS Studio...</span>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthLoader>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Dashboard Layout and Sub-Pages */}
              <Route path="/" element={<DashboardLayout />}>
                {/* Home / Overview */}
                <Route index element={<HomePage />} />

                {/* Gallery Items Routes */}
                <Route path="gallery" element={<GalleryPage />} />
                <Route path="api/gallery" element={<Navigate to="/gallery" replace />} />

                {/* Startups Routes */}
                <Route path="startups" element={<StartupsPage />} />
                <Route path="api/startups" element={<Navigate to="/startups" replace />} />

                {/* News Updates Routes */}
                <Route path="news" element={<NewsPage />} />
                <Route path="api/news" element={<Navigate to="/news" replace />} />

                {/* Team Members Routes */}
                <Route path="team" element={<TeamPage />} />
                <Route path="api/team" element={<Navigate to="/team" replace />} />
              </Route>

              {/* Fallback Catch-All Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthLoader>
      </AuthProvider>
    </ThemeProvider>
  );
}
