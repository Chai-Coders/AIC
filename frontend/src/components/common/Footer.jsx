import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APPLY_URL, CONTACT, HOST_INSTITUTE_URL, SOCIAL, telHref } from '../../data/site';

const LINK_GROUPS = [
  {
    title: 'The centre',
    links: [
      { label: 'Who we are', to: '/summary' },
      { label: 'Board of Governors', to: '/boardmember' },
      { label: 'Our team', to: '/aicteam' },
      { label: 'Mentors', to: '/mentor' },
      { label: 'Careers', to: '/careers' },
    ],
  },
  {
    title: 'Programmes',
    links: [
      { label: 'Pre-incubation (SIA)', to: '/sia' },
      { label: 'Seed Fund (SISFS)', to: '/sisfs' },
      { label: 'Acceleration', to: '/startup' },
      { label: 'Portfolio', to: '/startup#portfolio' },
      { label: 'News & gallery', to: '/news' },
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
      <i className="fa fa-angle-up" aria-hidden="true" />
    </button>
  );
};

const Footer = () => (
  <>
    <footer id="footer" className="site-footer">
      <div className="container site-footer__cta">
        <h2>
          Building something that matters? <em>Build it with us.</em>
        </h2>
        <div className="btn-row">
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply for incubation <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
          <Link className="btn btn--ghost-light" to="/#contact">
            Talk to us
          </Link>
        </div>
      </div>

      <div className="container site-footer__main">
        <div>
          <Link to="/" aria-label="AIC-IIITK home">
            <img className="site-footer__logo" src="/img/aic-logo-light.png" alt="AIC IIITK" width="518" height="70" loading="lazy" />
          </Link>
          <p className="site-footer__about">
            Atal Incubation Centre at the Indian Institute of Information Technology Kottayam. Supported by the Atal
            Innovation Mission, NITI Aayog.
          </p>
          <ul className="site-footer__social" aria-label="Social media">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} data-brand={s.brand}>
                  {s.text ? (
                    <span className="site-footer__x" aria-hidden="true">{s.text}</span>
                  ) : (
                    <i className={`fa ${s.icon}`} aria-hidden="true" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3>{group.title}</h3>
            <ul className="site-footer__links">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3>Visit &amp; contact</h3>
          <address className="site-footer__contact">
            <p>
              {CONTACT.address.map((line) => (
                <React.Fragment key={line}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
              <a href={CONTACT.mapUrl} target="_blank" rel="noopener noreferrer">
                Get directions <i className="fa fa-external-link" aria-hidden="true" />
              </a>
            </p>
            <ul aria-label="Email addresses">
              {CONTACT.emails.map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              ))}
            </ul>
            <ul aria-label="Phone numbers">
              {CONTACT.phones.slice(0, 2).map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)}>{phone}</a>
                </li>
              ))}
            </ul>
          </address>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>&copy; {new Date().getFullYear()} AIC IIIT Kottayam Foundation. All rights reserved.</p>
        <p>
          Hosted by{' '}
          <a href={HOST_INSTITUTE_URL} target="_blank" rel="noopener noreferrer">
            IIIT Kottayam
          </a>
        </p>
      </div>
    </footer>
    <BackToTop />
  </>
);

export default Footer;
