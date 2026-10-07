import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { ErrorState } from '../components/common/AsyncState';
import NewsCard from '../components/cards/NewsCard';
import useApi from '../hooks/useApi';
import { readCache } from '../api/cache';
import { fetchAllNews, fetchNewsItem } from '../api/content';
import { cdnImageProps, fitWideImage } from '../lib/image';
import { formatDate } from '../lib/format';

const NewsArticle = ({ id }) => {
  // Render instantly from the cached news list when we have it; the detail request refreshes it.
  const fromList = useMemo(() => readCache('news')?.data?.find((n) => String(n.id) === id) ?? null, [id]);
  const article = useApi(fetchNewsItem(id), fromList);
  const all = useApi(fetchAllNews);
  const item = article.data;

  if (!item && article.loading) {
    return (
      <div className="container container--narrow article" aria-busy="true">
        <div className="skeleton skeleton-line skeleton-line--title" />
        <div className="skeleton article__media" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container container--narrow">
        <ErrorState message="This article may have been removed." onRetry={article.retry} />
      </div>
    );
  }

  const more = all.data.filter((n) => String(n.id) !== id).slice(0, 3);

  return (
    <>
      <article className="container container--narrow article">
        <header className="article__head">
          <div className="news-card__meta">
            {item.subtitle && <span className="chip chip--primary">{item.subtitle}</span>}
            {item.published_date && <time dateTime={item.published_date}>{formatDate(item.published_date)}</time>}
          </div>
          <h1 className="article__title">{item.title}</h1>
        </header>
        {item.thumbnail && (
          <div className="media-frame article__media">
            <img {...cdnImageProps(item.thumbnail, [800, 1200, 1600], '(min-width: 900px) 860px, 100vw')} alt="" onLoad={fitWideImage} />
          </div>
        )}
        {item.content && <div className="prose">{item.content}</div>}
        <Link to="/news" className="text-link article__back">
          <i className="fa fa-arrow-left" aria-hidden="true" /> Back to all news
        </Link>
      </article>

      {more.length > 0 && (
        <section className="section section--white" aria-labelledby="more-news-title">
          <div className="container">
            <h2 id="more-news-title" className="section-title section-title--sm">More news</h2>
            <div className="grid grid--3">
              {more.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

const NewsDetailPage = () => {
  const { id } = useParams();
  return (
    <PageLayout title="News">
      <div className="page-top-spacer" />
      {/* key resets the article state when navigating between news items */}
      <NewsArticle key={id} id={id} />
    </PageLayout>
  );
};

export default NewsDetailPage;
