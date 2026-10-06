import React from 'react';
import PageLayout from '../components/common/PageLayout';
import PeopleCarousel from '../components/sections/PeopleCarousel';
import PeopleNav from '../components/sections/PeopleNav';

const BoardMemberPage = () => (
  <PageLayout
    title="Board of Governors"
    hero={{
      eyebrow: 'Leadership',
      title: 'Board of Governors',
      description: 'Leading industrialists and academicians who guide the strategy and governance of AIC-IIITKottayam.',
      breadcrumbs: [{ label: 'About' }, { label: 'Board of Governors' }],
    }}
  >
    <section className="section">
      <div className="container">
        <PeopleNav />
      </div>
    </section>
    <PeopleCarousel
      category="governor"
      title="AIC-IIITKottayam Board of Governors"
      variant="board"
      emptyText="No board members listed yet."
    />
  </PageLayout>
);

export default BoardMemberPage;
