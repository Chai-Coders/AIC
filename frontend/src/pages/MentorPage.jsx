import React, { useState } from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '../components/common/Tabs';

// Mentor sub-categories, matching the TeamMember.CATEGORY_CHOICES values on the backend.
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

const MentorPage = () => {
  const [activeCategory, setActiveCategory] = useState(MENTOR_CATEGORIES[0].value);

  return (
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

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <div className="container mentor-tabs-section">
          <TabsList aria-label="Mentor categories" className="tabs">
            {MENTOR_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="tabs__link">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {MENTOR_CATEGORIES.map((cat) => (
          <TabsPanel key={cat.value} value={cat.value}>
            <PeopleCarousel category={cat.value} title={cat.label} emptyText={cat.emptyText} />
          </TabsPanel>
        ))}
      </Tabs>
    </PageLayout>
  );
};

export default MentorPage;
