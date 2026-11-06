import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

const AicTeamPage = () => (
  <PageLayout
    title="Our Team"
    hero={{
      prefix: 'team.hero',
      breadcrumbs: [{ label: 'About' }, { label: 'Our Team' }],
    }}
  >
    <div className="container people-nav-section">
      <PeopleNav />
    </div>
    <PeopleCarousel category="team" prefix="team.list" />
  </PageLayout>
);

export default AicTeamPage;
