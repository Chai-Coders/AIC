import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APPLY_URL, HOST_INSTITUTE_URL, MAP_URL, SOCIAL, telHref } from '../../data/site';
import { cmsKey, useList, useText } from '../../content/useText';
import { Editable, Text } from '../../content/Text';

// Column headings and link labels are the texts footer.<id>.title and footer.<id>.<i>.
const LINK_GROUPS = [
  { id: 'centre', links: ['/summary', '/boardmember', '/aicteam', '/mentor', '/careers'] },
  { id: 'programmes', links: ['/sia', '/sisfs', '/startup', '/startup#portfolio', '/news'] },
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

const Footer = () => {
  const t = useText();
  const list = useList();
  return (
  <>
    <footer id="footer" className="site-footer">
      <div className="container site-footer__cta">
        <h2>
          <Text k="footer.cta.title" />
        </h2>
        <div className="btn-row">
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            <Text k="footer.cta.apply" /> <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
          <Link className="btn btn--ghost-light" to="/#contact">
            <Text k="footer.cta.talk" />
          </Link>
        </div>
      </div>

      <div className="container site-footer__main">
        <div>
          <Link to="/" aria-label="AIC-IIITK home">
            <img className="site-footer__logo" src="/img/aic-logo-light.png" alt="AIC IIITK" width="518" height="70" loading="lazy" />
          </Link>
          <p className="site-footer__about">
            <Text k="footer.about" />
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
          <nav key={group.id} aria-label={t(`footer.${group.id}.title`)}>
            <h3>
              <Text k={`footer.${group.id}.title`} />
            </h3>
            <ul className="site-footer__links">
              {group.links.map((to, i) => (
                <li key={to}>
                  <Link to={to}>
                    <Text k={`footer.${group.id}.${i}`} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3>
            <Text k="footer.contact.title" />
          </h3>
          <address className="site-footer__contact">
            <p>
              <Editable k="contact.address">
                {list('contact.address').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </Editable>
              <a href={MAP_URL} target="_blank" rel="noopener noreferrer">
                <Text k="footer.directions" /> <i className="fa fa-external-link" aria-hidden="true" />
              </a>
            </p>
            <ul aria-label="Email addresses" {...cmsKey('contact.emails')}>
              {list('contact.emails').map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              ))}
            </ul>
            <ul aria-label="Phone numbers" {...cmsKey('contact.phones')}>
              {list('contact.phones').slice(0, 2).map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)}>{phone}</a>
                </li>
              ))}
            </ul>
          </address>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          &copy; {new Date().getFullYear()} <Text k="footer.copyright" />
        </p>
        <p>
          <Text k="footer.hosted" />{' '}
          <a href={HOST_INSTITUTE_URL} target="_blank" rel="noopener noreferrer">
            <Text k="footer.host" />
          </a>
        </p>
      </div>
    </footer>
    <BackToTop />
  </>
  );
};

export default Footer;
