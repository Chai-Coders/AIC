import React from 'react';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import ProgramContent from '../components/sections/ProgramContent';
import StartupGrid from '../components/sections/StartupGrid';
import { APPLY_URL } from '../data/site';
import { Text } from '../content/Text';

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

const StartupPage = () => (
  <PageLayout
    title="Acceleration & portfolio"
    hero={{
      prefix: 'startup.hero',
      breadcrumbs: [{ label: 'Programs' }, { label: 'Acceleration' }],
      actions: (
        <>
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            <Text k="startup.hero.apply" /> <i className="fa fa-external-link" aria-hidden="true" />
          </a>
          <a className="btn btn--outline" href="#portfolio">
            <Text k="startup.hero.browse" />
          </a>
        </>
      ),
    }}
  >
    <ProgramContent prefix="startup" cards={CARDS} />

    <section id="portfolio" className="section section--white" aria-labelledby="portfolio-title">
      <div className="container">
        <SectionHeader
          id="portfolio-title"
          prefix="startup.portfolio"
        />
        <StartupGrid />
      </div>
    </section>

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

export default StartupPage;
