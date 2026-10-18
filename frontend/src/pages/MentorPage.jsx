import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

// Mentor groups, matching `teamCategory` in convex-backend/convex/schema.ts.
// Each is shown as its own section, like the single section on the team and
// board pages.
const MENTOR_CATEGORIES = [
  {
    value: 'mentor_intl_industry',
    label: 'International Mentors - Industry',
    emptyText: 'No international industry mentors listed yet.',
  },
  {
    value: 'mentor_intl_academic',
    label: 'International Mentors - Academic',
    emptyText: 'No international academic mentors listed yet.',
  },
  {
    value: 'mentor_india_industry',
    label: 'India Mentors - Industry',
    emptyText: 'No India industry mentors listed yet.',
  },
  {
    value: 'mentor_india_academic',
    label: 'India Mentors - Academic',
    emptyText: 'No India academic mentors listed yet.',
  },
];

const MentorPage = () => (
  <PageLayout
    title="Mentors"
    hero={{
      eyebrow: 'Mentor network',
      title: 'Our mentors',
      description: 'Domain experts and seasoned founders, from India and abroad, who coach our startups.',
      breadcrumbs: [{ label: 'About' }, { label: 'Mentors' }],
    }}
  >
    <div className="container people-nav-section">
      <PeopleNav />
    </div>
    {MENTOR_CATEGORIES.map((cat) => (
      <PeopleCarousel key={cat.value} category={cat.value} title={cat.label} emptyText={cat.emptyText} />
    ))}
  </PageLayout>
);

export default MentorPage;
