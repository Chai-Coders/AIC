import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

const BoardMemberPage = () => (
  <PageLayout
    title="Board of Governors"
    hero={{
      prefix: 'board.hero',
      breadcrumbs: [{ label: 'About' }, { label: 'Board of Governors' }],
    }}
  >
    <div className="container people-nav-section">
      <PeopleNav />
    </div>
    <PeopleCarousel category="governor" prefix="board.list" variant="board" />
  </PageLayout>
);

export default BoardMemberPage;
