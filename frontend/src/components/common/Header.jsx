import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { APPLY_URL } from '../../data/site';

const NAV = [
  { label: 'Home', to: '/' },
  {
    label: 'About',
    id: 'about',
    items: [
      { label: 'Who we are', to: '/summary', desc: 'Mission, vision and facilities' },
      { label: 'Board of Governors', to: '/boardmember', desc: 'Leadership and governance' },
      { label: 'Our Team', to: '/aicteam', desc: 'The people running AIC' },
      { label: 'Mentors', to: '/mentor', desc: 'Our international mentor panel' },
    ],
  },
  {
    label: 'Programs',
    id: 'programs',
    items: [
      { label: 'Pre-Incubation (SIA)', to: '/sia', desc: 'Start-Up-In AIC cohort' },
      { label: 'Incubation (SISFS)', to: '/sisfs', desc: 'Startup India Seed Fund' },
      { label: 'Acceleration', to: '/startup', desc: 'Scale-up support for startups' },
    ],
  },
  { label: 'Portfolio', to: '/startup#portfolio' },
  {
    label: 'Media',
    id: 'media',
    items: [
      { label: 'News & Updates', to: '/news', desc: 'Announcements and events' },
      { label: 'Gallery', to: '/gallery', desc: 'Moments from the centre' },
    ],
  },
  { label: 'Careers', to: '/careers' },
];

const Header = ({ transparent = false }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setOpenGroup(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMenuOpen(false);
      }
    };
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const solid = !transparent || scrolled || menuOpen;
  const groupActive = (group) => group.items.some((item) => item.to === location.pathname);

  return (
    <header className={`site-header ${solid ? 'is-solid' : 'is-transparent'}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="AIC-IIITK home">
          <img
            src={solid ? '/img/aic-logo.png' : '/img/aic-logo-light.png'}
            alt="AIC IIITK"
            width="518"
            height="70"
          />
        </Link>

        <nav
          ref={navRef}
          id="primary-nav"
          className={`site-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Primary"
        >
          <ul className="site-nav__list">
            {NAV.map((entry) =>
              entry.items ? (
                <li
                  key={entry.id}
                  className={`site-nav__item has-menu ${openGroup === entry.id ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className={`site-nav__link ${groupActive(entry) ? 'is-active' : ''}`}
                    aria-expanded={openGroup === entry.id}
                    aria-controls={`menu-${entry.id}`}
                    onClick={() => setOpenGroup(openGroup === entry.id ? null : entry.id)}
                  >
                    {entry.label}
                    <i className="fa fa-angle-down" aria-hidden="true" />
                  </button>
                  <ul id={`menu-${entry.id}`} className="site-nav__menu">
                    {entry.items.map((item) => (
                      <li key={item.to}>
                        <NavLink to={item.to} className="site-nav__menu-link" end>
                          <span className="site-nav__menu-label">{item.label}</span>
                          <span className="site-nav__menu-desc">{item.desc}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={entry.to} className="site-nav__item">
                  <NavLink
                    to={entry.to}
                    end
                    className={({ isActive }) =>
                      `site-nav__link ${isActive && !entry.to.includes('#') ? 'is-active' : ''}`
                    }
                  >
                    {entry.label}
                  </NavLink>
                </li>
              )
            )}
          </ul>
          <div className="site-nav__actions">
            <Link to="/#contact" className="btn btn--outline btn--sm site-nav__contact">
              Contact
            </Link>
            <a className="btn btn--primary btn--sm" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
              Apply now
            </a>
          </div>
        </nav>

        <button
          type="button"
          className={`site-header__toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
};

export default Header;
