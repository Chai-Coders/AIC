import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

// Mentor groups, matching `teamCategory` in convex-backend/convex/schema.ts.
// Each is shown as its own section, like the single section on the team and
// board pages. Headings and empty texts are mentor.groups.<i>.title / .empty.
const MENTOR_CATEGORIES = ['mentor_intl_industry', 'mentor_intl_academic', 'mentor_india_industry', 'mentor_india_academic'];

const MentorPage = () => (
  <PageLayout
    title="Mentors"
    hero={{
      prefix: 'mentor.hero',
      breadcrumbs: [{ label: 'About' }, { label: 'Mentors' }],
    }}
  >
    <div className="container people-nav-section">
      <PeopleNav />
    </div>
    {MENTOR_CATEGORIES.map((category, i) => (
      <PeopleCarousel key={category} category={category} prefix={`mentor.groups.${i}`} />
    ))}
  </PageLayout>
);

export default MentorPage;
