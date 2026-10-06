import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT, SOCIAL, telHref } from '../../data/site';
import './Footer.css';

const QUICK_LINKS = [
  [
    { label: 'Home', to: '/' },
    { label: 'AIC IIITK at a Glance', to: '/summary' },
    { label: 'People & Culture', to: '/aicteam' },
    { label: 'Programs', to: '/sia' },
    { label: 'Portfolio', to: '/startup' },
  ],
  [
    { label: 'News & Media', to: '/news' },
    { label: 'Insights', to: '/sia' },
    { label: 'Mentors', to: '/mentor' },
    { label: 'Careers', to: '/careers' },
    { label: 'Gallery', to: '/gallery' },
  ],
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
      id="back-to-top"
      className={`back-to-top ${visible ? 'is-visible' : ''}`}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="fa fa-angle-up" aria-hidden="true" />
    </button>
  );
};

/**
 * One icon button that reveals a list of links (emails or phone numbers).
 * Shows on hover and keyboard focus; on touch screens a tap toggles it.
 */
const ContactPopover = ({ icon, label, items, toHref }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close a tapped popover when the user taps elsewhere or presses Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`footer-popover ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="footer-popover__trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`fa ${icon}`} aria-hidden="true" />
      </button>
      <div className="footer-popover__panel">
        <ul className="footer-popover__list" aria-label={label}>
          {items.map((item) => (
            <li key={item}>
              <a href={toHref(item)}>{item}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Footer = () => (
  <>
    <footer id="footer" className="aic-footer">
      <div className="aic-footer-main">
        <div className="aic-footer-brand">
          <ul className="footer-follow" aria-label="Social media links">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  {s.text ? (
                    <span className="footer-x" aria-hidden="true">{s.text}</span>
                  ) : (
                    <i className={`fa ${s.icon}`} aria-hidden="true" />
                  )}
                </a>
              </li>
            ))}
          </ul>
          <h2>Get in <span>Touch</span></h2>
          <Link className="footer-contact-link" to="/#contact">Contact Us</Link>
        </div>

        <div className="aic-footer-links">
          <h3>Quick Links</h3>
          <div className="footer-link-columns">
            {QUICK_LINKS.map((column, i) => (
              <ul key={i}>
                {column.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <div className="aic-footer-contact">
          <p className="footer-address">
            <i className="fa fa-map-marker" aria-hidden="true" />
            {CONTACT.address.map((line) => (
              <React.Fragment key={line}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
          <iframe
            className="footer-map"
            src={CONTACT.mapEmbedUrl}
            title="AIC-IIITK location on Google Maps"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a className="footer-map-link" href={CONTACT.mapUrl} target="_blank" rel="noopener noreferrer">
            Open in Google Maps <i className="fa fa-external-link" aria-hidden="true" />
          </a>
          <div className="footer-contact-icons">
            <ContactPopover
              icon="fa-envelope"
              label="Email addresses"
              items={CONTACT.emails}
              toHref={(email) => `mailto:${email}`}
            />
            <ContactPopover
              icon="fa-phone"
              label="Phone numbers"
              items={CONTACT.phones}
              toHref={telHref}
            />
          </div>
        </div>
      </div>

      <div className="aic-footer-bottom">
        <p>Copyright &copy; 2026 AIC-IIIT Kottayam. All Rights Reserved.</p>
      </div>
    </footer>
    <BackToTop />
  </>
);

export default Footer;
