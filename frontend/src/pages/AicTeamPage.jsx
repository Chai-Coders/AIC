import React from 'react';
import PageLayout from '../components/common/PageLayout';
import MemberGrid from '../components/sections/MemberGrid';
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
        <MemberGrid category="team" emptyText="No team members listed yet." />
      </div>
    </section>
  </PageLayout>
);

export default AicTeamPage;
