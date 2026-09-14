import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import HomePage from './pages/HomePage';
import BoardMemberPage from './pages/BoardMemberPage';
import AicTeamPage from './pages/AicTeamPage';
import MentorPage from './pages/MentorPage';
import StartupPage from './pages/StartupPage';
import SummaryPage from './pages/SummaryPage';
import NewsPage from './pages/NewsPage';
import SiaPage from './pages/SiaPage';
import SisfsPage from './pages/SisfsPage';
import CareersPage from './pages/CareersPage';
import GalleryPage from './pages/GalleryPage';

// Helper component to handle scrolling to top or hashtag on route change
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        const nav = document.getElementById('nav');
        const navOffset = nav ? nav.offsetHeight + 14 : 90;
        const elementTop = element.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
          top: Math.max(elementTop - navOffset, 0),
          behavior: 'smooth',
        });
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Core Clean Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/boardmember" element={<BoardMemberPage />} />
        <Route path="/aicteam" element={<AicTeamPage />} />
        <Route path="/mentor" element={<MentorPage />} />
        <Route path="/startup" element={<StartupPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/sia" element={<SiaPage />} />
        <Route path="/SIA" element={<SiaPage />} />
        <Route path="/sisfs" element={<SisfsPage />} />
        <Route path="/SISFS" element={<SisfsPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Backward compatibility redirects for legacy .html URLs */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/index" element={<Navigate to="/" replace />} />
        <Route path="/boardmember.html" element={<Navigate to="/boardmember" replace />} />
        <Route path="/aicteam.html" element={<Navigate to="/aicteam" replace />} />
        <Route path="/mentor.html" element={<Navigate to="/mentor" replace />} />
        <Route path="/startup.html" element={<Navigate to="/startup" replace />} />
        <Route path="/summary.html" element={<Navigate to="/summary" replace />} />
        <Route path="/news.html" element={<Navigate to="/news" replace />} />
        <Route path="/SIA.html" element={<Navigate to="/sia" replace />} />
        <Route path="/sia.html" element={<Navigate to="/sia" replace />} />
        <Route path="/SISFS.html" element={<Navigate to="/sisfs" replace />} />
        <Route path="/sisfs.html" element={<Navigate to="/sisfs" replace />} />
        <Route path="/careers.html" element={<Navigate to="/careers" replace />} />
        <Route path="/gallery.html" element={<Navigate to="/gallery" replace />} />

        {/* Fallback route */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
