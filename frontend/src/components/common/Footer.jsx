import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APPLY_URL, CONTACT, SOCIAL, telHref } from '../../data/site';

const COLUMNS = [
  {
    title: 'About',
    links: [
      { label: 'Who we are', to: '/summary' },
      { label: 'Board of Governors', to: '/boardmember' },
      { label: 'Our Team', to: '/aicteam' },
      { label: 'Mentors', to: '/mentor' },
    ],
  },
  {
    title: 'Programs',
    links: [
      { label: 'Pre-Incubation (SIA)', to: '/sia' },
      { label: 'Incubation (SISFS)', to: '/sisfs' },
      { label: 'Acceleration', to: '/startup' },
      { label: 'Portfolio', to: '/startup#portfolio' },
    ],
  },
  {
    title: 'Media',
    links: [
      { label: 'News & Updates', to: '/news' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'Careers', to: '/careers' },
      { label: 'Contact', to: '/#contact' },
    ],
  },
];

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top ${visible ? 'is-visible' : ''}`}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="fa fa-arrow-up" aria-hidden="true" />
    </button>
  );
};

const Footer = () => (
  <>
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cta">
          <div>
            <h2>Have an idea worth building?</h2>
            <p>Apply to incubate with AIC-IIITK and get mentoring, infrastructure and funding support.</p>
          </div>
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply for incubation <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
        </div>

        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <img src="/img/aic-logo-light.png" alt="AIC IIITK" width="518" height="70" loading="lazy" />
            <p>
              Atal Incubation Centre of the Indian Institute of Information Technology Kottayam, supported by
              AIM, NITI Aayog, Government of India.
            </p>
            <ul className="site-footer__social" aria-label="Social media">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <i className={`fa ${s.icon}`} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="site-footer__col">
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="site-footer__col site-footer__contact">
            <h3>Contact</h3>
            <address>
              <i className="fa fa-map-marker" aria-hidden="true" />
              <span>
                {CONTACT.address.map((line) => (
                  <React.Fragment key={line}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </span>
            </address>
            {CONTACT.emails.map((email) => (
              <a key={email} href={`mailto:${email}`}>
                <i className="fa fa-envelope-o" aria-hidden="true" />
                {email}
              </a>
            ))}
            <a href={telHref(CONTACT.phones[0])}>
              <i className="fa fa-phone" aria-hidden="true" />
              {CONTACT.phones[0]}
            </a>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>&copy; {new Date().getFullYear()} AIC-IIITK Foundation. All rights reserved.</p>
          <p>
            Supported by <abbr title="Atal Innovation Mission">AIM</abbr>, NITI Aayog
          </p>
        </div>
      </div>
    </footer>
    <BackToTop />
  </>
);

export default Footer;
