import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = ({ transparent = false }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const navClass = `navbar fixed-nav ${navOpen ? 'open' : ''}`;

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

            <li className={`has-dropdown ${openDropdown === 'about' ? 'open-drop' : ''}`}>
              <button className="nav-trigger" type="button" aria-haspopup="true" onClick={() => setOpenDropdown(openDropdown === 'about' ? null : 'about')}>About Us</button>
              <ul className="dropdown">
                <li><Link to="/summary.html" onClick={() => setNavOpen(false)}>Who are we?</Link></li>
                <li><Link to="/boardmember.html" onClick={() => setNavOpen(false)}>Board of Governors</Link></li>
                <li><Link to="/aicteam.html" onClick={() => setNavOpen(false)}>Our Team</Link></li>
                <li><Link to="/mentor.html" onClick={() => setNavOpen(false)}>Our Mentors</Link></li>
              </ul>
            </li>

            <li className={`has-dropdown ${openDropdown === 'programs' ? 'open-drop' : ''}`}>
              <button className="nav-trigger" type="button" aria-haspopup="true" onClick={() => setOpenDropdown(openDropdown === 'programs' ? null : 'programs')}>Programs</button>
              <ul className="dropdown">
                <li><Link to="/SIA.html" onClick={() => setNavOpen(false)}>Pre-Incubation</Link></li>
                <li><Link to="/SISFS.html" onClick={() => setNavOpen(false)}>Incubation</Link></li>
                <li><Link to="/startup.html" onClick={() => setNavOpen(false)}>Acceleration</Link></li>
              </ul>
            </li>

            <li>
              <Link to="/startup.html" onClick={() => setNavOpen(false)}>Portfolio</Link>
            </li>

            <li className={`has-dropdown ${openDropdown === 'news' ? 'open-drop' : ''}`}>
              <button className="nav-trigger" type="button" aria-haspopup="true" onClick={() => setOpenDropdown(openDropdown === 'news' ? null : 'news')}>News &amp; Media</button>
              <ul className="dropdown">
                <li><Link to="/news.html" onClick={() => setNavOpen(false)}>News</Link></li>
                <li><Link to="/SIA.html" onClick={() => setNavOpen(false)}>SIA</Link></li>
              </ul>
            </li>

            <li>
              <Link to="/summary.html" onClick={() => setNavOpen(false)}>Insights</Link>
            </li>

            <li className={`has-dropdown ${openDropdown === 'connect' ? 'open-drop' : ''}`}>
              <button className="nav-trigger" type="button" aria-haspopup="true" onClick={() => setOpenDropdown(openDropdown === 'connect' ? null : 'connect')}>Connect</button>
              <ul className="dropdown">
                <li><Link to="/#contact" onClick={() => setNavOpen(false)}>Contact</Link></li>
                <li><Link to="/mentor.html" onClick={() => setNavOpen(false)}>Mentors</Link></li>
                <li><Link to="/careers.html" onClick={() => setNavOpen(false)}>Careers</Link></li>
              </ul>
            </li>

          </ul>
        </div>
      </nav>
      <div className="nav-offset" aria-hidden="true"></div>
    </header>
  );
};

export default Header;
