import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

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
        <Route path="/" element={<HomePage />} />
        <Route path="/index.html" element={<HomePage />} />
        
        <Route path="/boardmember.html" element={<BoardMemberPage />} />
        <Route path="/boardmember" element={<BoardMemberPage />} />
        
        <Route path="/aicteam.html" element={<AicTeamPage />} />
        <Route path="/aicteam" element={<AicTeamPage />} />
        
        <Route path="/mentor.html" element={<MentorPage />} />
        <Route path="/mentor" element={<MentorPage />} />
        
        <Route path="/startup.html" element={<StartupPage />} />
        <Route path="/startup" element={<StartupPage />} />
        
        <Route path="/summary.html" element={<SummaryPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        
        <Route path="/news.html" element={<NewsPage />} />
        <Route path="/news" element={<NewsPage />} />
        
        <Route path="/SIA.html" element={<SiaPage />} />
        <Route path="/SIA" element={<SiaPage />} />
        
        <Route path="/SISFS.html" element={<SisfsPage />} />
        <Route path="/SISFS" element={<SisfsPage />} />
        
        <Route path="/careers.html" element={<CareersPage />} />
        <Route path="/careers" element={<CareersPage />} />
        
        <Route path="/gallery.html" element={<GalleryPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        
        {/* Fallback route */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default App;
