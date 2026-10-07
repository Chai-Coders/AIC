import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

const MentorPage = () => (
  <PageLayout
    title="Mentors"
    hero={{
      eyebrow: 'Mentor network',
      title: 'International mentors',
      description: 'Domain experts and seasoned founders from around the world who coach our startups.',
      breadcrumbs: [{ label: 'About' }, { label: 'Mentors' }],
    }}
  >
    <div className="container people-nav-section">
      <PeopleNav />
    </div>
    <PeopleCarousel category="mentor" title="International Mentors" emptyText="No mentors listed yet." />
  </PageLayout>
);

export default MentorPage;
