import React from 'react';
import PageLayout from '../components/common/PageLayout';
import GalleryGrid from '../components/sections/GalleryGrid';

const GalleryPage = () => (
  <PageLayout
    title="Gallery"
    hero={{
      prefix: 'gallery.hero',
      breadcrumbs: [{ label: 'Gallery' }],
    }}
  >
    <section className="section">
      <div className="container">
        <GalleryGrid />
      </div>
    </section>
  </PageLayout>
);

export default GalleryPage;
