import React, { useState } from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import Lightbox from '../common/Lightbox';
import useApi from '../../hooks/useApi';
import { fetchAllGallery } from '../../api/content';
import { cdnImageProps } from '../../lib/image';

/**
 * Responsive photo grid with a lightbox. `limit` shows only the first N items
 * (the lightbox still only covers what's shown). `featured` makes the first
 * photo a 2x2 tile; with 9 photos that fills the grid at every breakpoint.
 */
const GalleryGrid = ({ limit, featured = false }) => {
  const gallery = useApi(fetchAllGallery);
  const [active, setActive] = useState(null);

  return (
    <AsyncState
      state={gallery}
      skeleton={<SkeletonGrid count={limit || 9} className="gallery-grid" media={false} />}
      empty={<EmptyState icon="fa-picture-o" title="No photos yet">Check back soon for photos from our events.</EmptyState>}
    >
      {(all) => {
        const items = limit ? all.slice(0, limit) : all;
        return (
          <>
            <ul className={`gallery-grid ${featured ? 'gallery-grid--featured' : ''}`}>
              {items.map((item, i) => (
                <li key={item.id}>
                  <button type="button" className="gallery-tile" onClick={() => setActive(i)}>
                    <img
                      {...(featured && i === 0
                        ? cdnImageProps(item.image, [800, 1200, 1600], '(min-width: 1100px) 50vw, (min-width: 640px) 66vw, 100vw')
                        : cdnImageProps(item.image, [400, 800], '(min-width: 1100px) 25vw, (min-width: 640px) 33vw, 50vw'))}
                      alt={item.subtext || `Gallery photo ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                    {item.subtext && <span className="gallery-tile__caption">{item.subtext}</span>}
                    <span className="gallery-tile__zoom" aria-hidden="true">
                      <i className="fa fa-expand" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Lightbox items={items} index={active} onChange={setActive} />
          </>
        );
      }}
    </AsyncState>
  );
};

export default GalleryGrid;
