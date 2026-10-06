import React from 'react';
import PageLayout from '../components/common/PageLayout';
import MemberGrid from '../components/sections/MemberGrid';
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
    <section className="section">
      <div className="container">
        <PeopleNav />
        <MemberGrid category="mentor" emptyText="No mentors listed yet." />
      </div>
    </section>
  </PageLayout>
);

export default MentorPage;
