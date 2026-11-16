import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import ProgramContent from '../components/sections/ProgramContent';
import { Text } from '../content/Text';
import { useText } from '../content/useText';

// Partners have no API endpoint, so they stay static.
const PARTNERS = [
  { name: 'JioGenNext', img: '/img/partner/jio.png', link: 'https://www.jiogennext.com/' },
  { name: 'CCMB', img: '/img/partner/molecular.jpg', link: 'http://aic.ccmb.res.in/' },
  { name: 'SVPISTM', img: '/img/partner/svet.jpg', link: 'https://svpistm.ac.in/' },
  { name: 'S.S. Rana & Co.', img: '/img/partner/ssrana.png', link: 'https://www.ssrana.in/' },
  { name: 'AIC MUJ', img: '/img/partner/mai.png', link: 'https://www.aicmuj.com/' },
];

// Card titles and points are the texts startup.cards.<i>.title / .items.
const CARDS = [{ icon: 'fa-check-circle' }, { icon: 'fa-refresh' }, { icon: 'fa-trophy', accent: true }, { icon: 'fa-rocket' }];

const StartupPage = () => {
  const t = useText();
  const { hash } = useLocation();
  // The portfolio used to be a section of this page; send old links to its own page.
  if (hash === '#portfolio') return <Navigate to="/portfolio" replace />;
  return (
  <PageLayout
    title="Acceleration"
    hero={{
      prefix: 'startup.hero',
      breadcrumbs: [{ label: 'Programs' }, { label: 'Acceleration' }],
      actions: (
        <>
          <a className="btn btn--accent" href={t('links.apply')} target="_blank" rel="noopener noreferrer">
            <Text k="startup.hero.apply" /> <i className="fa fa-external-link" aria-hidden="true" />
          </a>
          <Link className="btn btn--outline" to="/portfolio">
            <Text k="startup.hero.browse" />
          </Link>
        </>
      ),
    }}
  >
    <ProgramContent prefix="startup" cards={CARDS} />

    <section className="section" aria-labelledby="partners-title">
      <div className="container">
        <SectionHeader id="partners-title" prefix="startup.partners" align="center" />
        <ul className="partner-grid">
          {PARTNERS.map((p) => (
            <li key={p.name}>
              <a href={p.link} target="_blank" rel="noopener noreferrer" className="partner-tile" title={p.name}>
                <img src={p.img} alt={p.name} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </PageLayout>
);
};

export default StartupPage;
