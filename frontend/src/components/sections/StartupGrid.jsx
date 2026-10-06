import React, { useDeferredValue, useMemo, useState } from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import Modal from '../common/Modal';
import useApi from '../../hooks/useApi';
import { fetchAllStartups } from '../../api/content';
import { cdnImage } from '../../lib/image';
import { displayHost, excerpt } from '../../lib/format';

const StartupCard = ({ startup, onOpen }) => (
  <article className="startup-card">
    <div className="startup-card__logo">
      <img src={cdnImage(startup.logo_or_image, 480)} alt="" loading="lazy" decoding="async" />
    </div>
    <div className="startup-card__body">
      <h3 className="startup-card__name">{startup.name}</h3>
      {startup.description && <p className="startup-card__desc">{excerpt(startup.description, 120)}</p>}
      <div className="startup-card__actions">
        <button type="button" className="text-link" onClick={() => onOpen(startup)}>
          Details<span className="sr-only"> about {startup.name}</span>
        </button>
        {startup.website_url && (
          <a className="text-link" href={startup.website_url} target="_blank" rel="noopener noreferrer">
            Website <i className="fa fa-external-link" aria-hidden="true" />
            <span className="sr-only"> of {startup.name}</span>
          </a>
        )}
      </div>
    </div>
  </article>
);

/** Searchable directory of all startups from the /startups/ API. */
const StartupGrid = () => {
  const startups = useApi(fetchAllStartups);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return startups.data;
    return startups.data.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    );
  }, [startups.data, deferredQuery]);

  return (
    <>
      <div className="toolbar">
        <p className="toolbar__count" aria-live="polite">
          {!startups.loading && !startups.error && (
            <>
              Showing <strong>{filtered.length}</strong> of {startups.data.length} startups
            </>
          )}
        </p>
        <label className="search-field">
          <span className="sr-only">Search startups</span>
          <i className="fa fa-search" aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder="Search by name or domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <AsyncState
        state={startups}
        skeleton={<SkeletonGrid count={8} className="grid grid--4" />}
        empty={<EmptyState icon="fa-rocket" title="No startups listed yet" />}
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState icon="fa-search" title={`No startups match “${query}”`}>
              Try a different name or keyword.
            </EmptyState>
          ) : (
            <div className="grid grid--4">
              {filtered.map((s) => (
                <StartupCard key={s.id} startup={s} onOpen={setSelected} />
              ))}
            </div>
          )
        }
      </AsyncState>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} label={selected?.name} className="startup-dialog">
        {selected && (
          <div className="startup-dialog__inner">
            <div className="startup-dialog__logo">
              <img src={cdnImage(selected.logo_or_image, 600)} alt={`${selected.name} logo`} />
            </div>
            <h2>{selected.name}</h2>
            {selected.description && <p className="prose">{selected.description}</p>}
            {selected.website_url && (
              <a className="btn btn--primary" href={selected.website_url} target="_blank" rel="noopener noreferrer">
                Visit {displayHost(selected.website_url)} <i className="fa fa-external-link" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default StartupGrid;
