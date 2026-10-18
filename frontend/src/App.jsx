import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import HomePage from './pages/HomePage';
import SplashScreen from './components/common/SplashScreen';
import useScrollReveal from './hooks/useScrollReveal';

const BoardMemberPage = lazy(() => import('./pages/BoardMemberPage'));
const AicTeamPage = lazy(() => import('./pages/AicTeamPage'));
const MentorPage = lazy(() => import('./pages/MentorPage'));
const StartupPage = lazy(() => import('./pages/StartupPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const SiaPage = lazy(() => import('./pages/SiaPage'));
const SisfsPage = lazy(() => import('./pages/SisfsPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Scroll to the top on navigation, or to the #hash target when there is one.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return undefined;
    }
    // The target may be in a lazily loaded page; retry briefly until it exists.
    let tries = 0;
    const id = window.setInterval(() => {
      const element = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (element || ++tries > 20) {
        window.clearInterval(id);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [pathname, hash]);

  return null;
}

const PageFallback = () => <div className="page-loading" aria-busy="true" aria-label="Loading page" />;

// Legacy .html URLs from the old static site (route matching is case-insensitive).
const LEGACY = {
  '/index.html': '/',
  '/index': '/',
  '/boardmember.html': '/boardmember',
  '/aicteam.html': '/aicteam',
  '/mentor.html': '/mentor',
  '/startup.html': '/startup',
  '/summary.html': '/summary',
  '/news.html': '/news',
  '/sia.html': '/sia',
  '/sisfs.html': '/sisfs',
  '/careers.html': '/careers',
  '/gallery.html': '/gallery',
};

function App() {
  useScrollReveal();

  return (
    <>
      <SplashScreen />
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boardmember" element={<BoardMemberPage />} />
          <Route path="/aicteam" element={<AicTeamPage />} />
          <Route path="/mentor" element={<MentorPage />} />
          <Route path="/startup" element={<StartupPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/sia" element={<SiaPage />} />
          <Route path="/sisfs" element={<SisfsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/gallery" element={<GalleryPage />} />

          {Object.entries(LEGACY).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
