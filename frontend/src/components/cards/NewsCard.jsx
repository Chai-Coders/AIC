import React from 'react';
import { Link } from 'react-router-dom';
import { cdnImageProps, fitWideImage } from '../../lib/image';
import { excerpt, formatDate } from '../../lib/format';

const NewsCard = ({ item, featured = false }) => (
  <article className={`news-card ${featured ? 'news-card--featured' : ''}`}>
    <div className="news-card__media">
      {item.thumbnail ? (
        <img
          {...cdnImageProps(item.thumbnail, [400, 800, 1200], featured ? '(min-width: 900px) 55vw, 100vw' : '(min-width: 900px) 33vw, 100vw')}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={fitWideImage}
        />
      ) : (
        <span className="news-card__placeholder" aria-hidden="true">
          <i className="fa fa-newspaper-o" />
        </span>
      )}
    </div>
    <div className="news-card__body">
      <div className="news-card__meta">
        {item.subtitle && <span className="chip chip--primary">{item.subtitle}</span>}
        {item.published_date && <time dateTime={item.published_date}>{formatDate(item.published_date)}</time>}
      </div>
      <h3 className="news-card__title">
        <Link to={`/news/${item.id}`} className="stretched-link">
          {item.title}
        </Link>
      </h3>
      {item.content && <p className="news-card__text">{excerpt(item.content, featured ? 260 : 140)}</p>}
      <span className="text-link news-card__more" aria-hidden="true">
        Read more <i className="fa fa-arrow-right" />
      </span>
    </div>
  </article>
);

export default NewsCard;
