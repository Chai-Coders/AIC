import React from 'react';

/** Grid of placeholder cards shown while a list is loading. */
export const SkeletonGrid = ({ count = 6, className = 'grid grid--3', media = true }) => (
  <div className={className} aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton-card">
        {media && <div className="skeleton skeleton-card__media" />}
        <div className="skeleton-card__body">
          <div className="skeleton skeleton-line skeleton-line--title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line--short" />
        </div>
      </div>
    ))}
  </div>
);

export const ErrorState = ({ message = 'Something went wrong while loading this content.', onRetry }) => (
  <div className="state state--error" role="alert">
    <i className="fa fa-exclamation-circle" aria-hidden="true" />
    <p className="state__title">We couldn&rsquo;t load this right now</p>
    <p>{message}</p>
    {onRetry && (
      <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
        <i className="fa fa-refresh" aria-hidden="true" /> Try again
      </button>
    )}
  </div>
);

export const EmptyState = ({ icon = 'fa-inbox', title = 'Nothing here yet', children }) => (
  <div className="state">
    <i className={`fa ${icon}`} aria-hidden="true" />
    <p className="state__title">{title}</p>
    {children && <p>{children}</p>}
  </div>
);

/**
 * Renders the right state for a useApi() result.
 * Children is a render function receiving the data once there is something to show.
 */
const AsyncState = ({ state, skeleton, empty, isEmpty, children }) => {
  const { data, loading, error, retry } = state;
  if (loading) return skeleton ?? <SkeletonGrid />;
  if (error) return <ErrorState onRetry={retry} />;
  const blank = isEmpty ? isEmpty(data) : !data || (Array.isArray(data) && data.length === 0);
  if (blank) return empty ?? <EmptyState />;
  return children(data);
};

export default AsyncState;
