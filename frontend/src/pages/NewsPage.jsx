import React from 'react';
import PageLayout from '../components/common/PageLayout';
import NewsList from '../components/sections/NewsList';

const NewsPage = () => (
  <PageLayout
    title="News & Updates"
    hero={{
      eyebrow: 'Newsroom',
      title: 'News & updates',
      description: 'Announcements, events and milestones from AIC-IIITKottayam and our startups.',
      breadcrumbs: [{ label: 'News' }],
    }}
  >
    <section className="section">
      <div className="container">
        <NewsList />
      </div>
    </section>
  </PageLayout>
);

export default NewsPage;
