import React from 'react';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import ProgramContent from '../components/sections/ProgramContent';
import StartupGrid from '../components/sections/StartupGrid';
import { APPLY_URL } from '../data/site';

// Partners have no API endpoint, so they stay static.
const PARTNERS = [
  { name: 'JioGenNext', img: '/img/partner/jio.png', link: 'https://www.jiogennext.com/' },
  { name: 'CCMB', img: '/img/partner/molecular.jpg', link: 'http://aic.ccmb.res.in/' },
  { name: 'SVPISTM', img: '/img/partner/svet.jpg', link: 'https://svpistm.ac.in/' },
  { name: 'S.S. Rana & Co.', img: '/img/partner/ssrana.png', link: 'https://www.ssrana.in/' },
  { name: 'AIC MUJ', img: '/img/partner/mai.png', link: 'https://www.aicmuj.com/' },
];

const CARDS = [
  {
    icon: 'fa-check-circle',
    title: 'Key features',
    items: [
      'Dedicated acceleration support for growth-stage startups',
      'Mentor network and expert interventions for scale-up challenges',
      'Access to the partner ecosystem, industry connects and market channels',
      'Strategic support in product, operations and business expansion',
    ],
  },
  {
    icon: 'fa-refresh',
    title: 'Programme flow',
    items: [
      'Startup selection based on growth potential and market readiness',
      'Goal setting with a milestone-driven acceleration roadmap',
      'Periodic reviews with domain experts and seasoned business mentors',
      'Investor readiness, market access and strategic partnership support',
    ],
  },
  {
    icon: 'fa-trophy',
    title: 'Expected outcome',
    accent: true,
    items: [
      'Faster go-to-market and improved business traction',
      'Improved fundraising readiness and growth strategy execution',
      'A scalable operating model with stronger market presence',
      'Direct links with institutional investors and industry collaborators',
    ],
  },
  {
    icon: 'fa-rocket',
    title: 'Acceleration highlights',
    items: [
      '1-on-1 strategic growth mentorship sessions',
      'Cloud credits, prototyping labs and testing setup',
      'Corporate tie-ups and pilot opportunities with partners',
      'Access to AIM, DPIIT, SISFS and venture funding schemes',
    ],
  },
];

const StartupPage = () => (
  <PageLayout
    title="Acceleration & portfolio"
    hero={{
      eyebrow: 'Acceleration programme',
      title: 'Scale faster with AIC-IIITKottayam',
      description:
        'Dedicated mentoring, technical infrastructure, funding avenues and partner networks for early and growth-stage startups.',
      breadcrumbs: [{ label: 'Programs' }, { label: 'Acceleration' }],
      actions: (
        <>
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply for acceleration <i className="fa fa-external-link" aria-hidden="true" />
          </a>
          <a className="btn btn--outline" href="#portfolio">
            Browse portfolio
          </a>
        </>
      ),
    }}
  >
    <ProgramContent cards={CARDS} />

    <section id="portfolio" className="section section--white" aria-labelledby="portfolio-title">
      <div className="container">
        <SectionHeader
          id="portfolio-title"
          eyebrow="Portfolio"
          title="Our promising startups"
          lead="Ventures incubated and accelerated at AIC-IIITKottayam."
        />
        <StartupGrid />
      </div>
    </section>

    <section className="section" aria-labelledby="partners-title">
      <div className="container">
        <SectionHeader id="partners-title" eyebrow="Ecosystem" title="Our partners" align="center" />
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
