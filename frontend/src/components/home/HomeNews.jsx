import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import AsyncState, { SkeletonGrid } from '../common/AsyncState';
import NewsCard from '../cards/NewsCard';
import useApi from '../../hooks/useApi';
import { fetchAllNews } from '../../api/content';

const HomeNews = () => {
  const news = useApi(fetchAllNews);

  // Hide the whole section rather than show an empty block on the home page.
  if (!news.loading && !news.error && news.data.length === 0) return null;

  return (
    <section id="latest-news" className="section section--white" aria-labelledby="latest-news-title">
      <div className="container">
        <SectionHeader
          id="latest-news-title"
          eyebrow="News & updates"
          title="Latest from the centre"
          lead="Announcements, events and milestones from AIC-IIITKottayam and our startups."
          aside={
            <Link to="/news" className="btn btn--outline">
              All news <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          }
        />
        <AsyncState state={news} skeleton={<SkeletonGrid count={3} />}>
          {(items) => (
            <div className="grid grid--3">
              {items.slice(0, 3).map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </AsyncState>
      </div>
    </section>
  );
};

export default HomeNews;
