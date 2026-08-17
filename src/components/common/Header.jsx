import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ transparent = false }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navClass = `navbar ${transparent && !scrolled ? 'nav-transparent' : ''} ${scrolled ? 'fixed-nav' : ''}`;

  return (
    <header id="home">
      <nav id="nav" className={navClass}>
        <div className="container">
          <div className="navbar-header">
            {/* Logo */}
            <div className="navbar-brand">
              <Link to="/">
                <img className="logo" src="/img/nlogo.png" alt="logo" />
                {transparent && <img className="logo-alt" src="/img/nlogo.png" alt="logo" />}
              </Link>
            </div>
            {/* Collapse nav button */}
            <div 
              className={`nav-collapse ${navOpen ? 'open' : ''}`}
              onClick={() => setNavOpen(!navOpen)}
              style={{ cursor: 'pointer' }}
            >
              <span></span>
            </div>
          </div>

          {/* Main navigation */}
          <ul className={`main-nav nav navbar-nav navbar-right ${navOpen ? 'open' : ''}`}>
            <li>
              <Link to="/" onClick={() => setNavOpen(false)}>Home</Link>
            </li>

            <li className="has-dropdown">
              <a href="#about" onClick={(e) => e.preventDefault()}>About Us</a>
              <ul className="dropdown">
                <li><Link to="/summary.html" onClick={() => setNavOpen(false)}>Who are we?</Link></li>
                <li><Link to="/boardmember.html" onClick={() => setNavOpen(false)}>Board of Governors</Link></li>
                <li><Link to="/aicteam.html" onClick={() => setNavOpen(false)}>Our Team</Link></li>
                <li><Link to="/mentor.html" onClick={() => setNavOpen(false)}>Our Mentors</Link></li>
              </ul>
            </li>

            <li className="has-dropdown">
              <a href="#news" onClick={(e) => e.preventDefault()}>News-Events</a>
              <ul className="dropdown">
                <li><Link to="/news.html" onClick={() => setNavOpen(false)}>News</Link></li>
                <li><Link to="/SIA.html" onClick={() => setNavOpen(false)}>SIA</Link></li>
              </ul>
            </li>

            <li>
              <Link to="/startup.html" onClick={() => setNavOpen(false)}>Our Start-ups</Link>
            </li>

            <li className="has-dropdown">
              <a href="#apply" onClick={(e) => e.preventDefault()}>Apply Now</a>
              <ul className="dropdown">
                <li><Link to="/SISFS.html" onClick={() => setNavOpen(false)}>Seed Fund</Link></li>
                <li><Link to="/SIA.html" onClick={() => setNavOpen(false)}>Start-Up in AIC</Link></li>
                <li><Link to="/careers.html" onClick={() => setNavOpen(false)}>Careers</Link></li>
                <li><a href="https://forms.gle/2c4NgmXp4B16zGet6" target="_blank" rel="noopener noreferrer">Incubates</a></li>
                <li><a href="https://goo.gl/forms/5BGUvajn6IoUryqF3" target="_blank" rel="noopener noreferrer">Mentors</a></li>
                <li><a href="https://goo.gl/forms/5BGUvajn6IoUryqF3" target="_blank" rel="noopener noreferrer">Partners</a></li>
                <li><a href="https://forms.gle/Za23sypnehNfD5dW8" target="_blank" rel="noopener noreferrer">Nodal Centers</a></li>
              </ul>
            </li>

            <li>
              <Link to="/gallery.html" onClick={() => setNavOpen(false)}>Gallery</Link>
            </li>

            <li>
              {location.pathname === '/' ? (
                <a href="#contact">Contact</a>
              ) : (
                <Link to="/#contact" onClick={() => setNavOpen(false)}>Contact</Link>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
