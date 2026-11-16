import React from 'react';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import StartupGrid from '../components/sections/StartupGrid';

const PortfolioPage = () => (
  <PageLayout
    title="Portfolio"
    hero={{ prefix: 'portfolio.hero', breadcrumbs: [{ label: 'Portfolio' }] }}
  >
    <section className="section section--white" aria-labelledby="portfolio-title">
      <div className="container">
        <SectionHeader id="portfolio-title" prefix="startup.portfolio" />
        <StartupGrid />
      </div>
    </section>
  </PageLayout>
);

export default PortfolioPage;
