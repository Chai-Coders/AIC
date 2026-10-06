import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import { ErrorState } from '../common/AsyncState';
import useApi from '../../hooks/useApi';
import { fetchAllStartups } from '../../api/content';
import { cdnImage } from '../../lib/image';

const Row = ({ items, reverse }) => (
  <div className="logo-marquee__row">
    <ul className={`logo-marquee__track ${reverse ? 'is-reverse' : ''}`}>
      {/* Items are rendered twice so the loop is seamless; the copy is hidden from assistive tech. */}
      {[...items, ...items].map((item, i) => (
        <li key={`${item.id}-${i}`} className="logo-tile" aria-hidden={i >= items.length || undefined}>
          <img src={cdnImage(item.logo_or_image, 320)} alt={item.name} title={item.name} loading="lazy" decoding="async" />
        </li>
      ))}
    </ul>
  </div>
);

const HomeStartups = () => {
  const { data: startups, loading, error, retry } = useApi(fetchAllStartups);

  const rows = useMemo(() => {
    if (startups.length < 8) return [startups];
    const half = Math.ceil(startups.length / 2);
    return [startups.slice(0, half), startups.slice(half)];
  }, [startups]);

  return (
    <section id="startups-building" className="section" aria-labelledby="startups-title">
      <div className="container">
        <SectionHeader
          id="startups-title"
          eyebrow="Portfolio"
          title="Startups building with AIC"
          lead="High-growth tech ventures and innovative entrepreneurs incubated at the centre."
          aside={
            <Link to="/startup#portfolio" className="btn btn--outline">
              View all startups <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          }
        />
      </div>

      {loading && (
        <div className="container">
          <div className="logo-marquee logo-marquee--loading" aria-busy="true" aria-label="Loading startups">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton logo-tile" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="container">
          <ErrorState onRetry={retry} />
        </div>
      )}

      {!loading && !error && startups.length > 0 && (
        <div className="logo-marquee">
          {rows.map((row, i) => (
            <Row key={i} items={row} reverse={i % 2 === 1} />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeStartups;
