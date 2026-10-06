import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

const AicTeamPage = () => (
  <PageLayout
    title="Our Team"
    hero={{
      eyebrow: 'People & culture',
      title: 'The AIC-IIITKottayam team',
      description: 'The people who run the centre day to day and work alongside our startups.',
      breadcrumbs: [{ label: 'About' }, { label: 'Our Team' }],
    }}
  >
    <section className="section">
      <div className="container">
        <PeopleNav />
      </div>
    </section>
    <PeopleCarousel category="team" title="AIC-IIITKottayam Team" emptyText="No team members listed yet." />
  </PageLayout>
);

export default AicTeamPage;
