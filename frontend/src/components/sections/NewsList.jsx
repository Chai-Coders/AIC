import React from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import NewsCard from '../cards/NewsCard';
import useApi from '../../hooks/useApi';
import { fetchAllNews } from '../../api/content';

/** All news from the /news/ API: the latest item is featured, the rest form a grid. */
const NewsList = () => {
  const news = useApi(fetchAllNews);

  return (
    <AsyncState
      state={news}
      skeleton={<SkeletonGrid count={6} />}
      empty={<EmptyState icon="fa-newspaper-o" title="No news yet">Announcements will appear here.</EmptyState>}
    >
      {([latest, ...rest]) => (
        <div className="stack">
          <NewsCard item={latest} featured />
          {rest.length > 0 && (
            <div className="grid grid--3">
              {rest.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </AsyncState>
  );
};

export default NewsList;
