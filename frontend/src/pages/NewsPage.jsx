import React from 'react';
import PageLayout from '../components/common/PageLayout';
import NewsList from '../components/sections/NewsList';

const NewsPage = () => (
  <PageLayout
    title="News & Updates"
    hero={{
      prefix: 'news.hero',
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
