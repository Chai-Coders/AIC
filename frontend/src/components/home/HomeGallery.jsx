import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import GalleryGrid from '../sections/GalleryGrid';

const HomeGallery = () => (
  <section id="gallery-preview" className="section section--rule" aria-labelledby="gallery-preview-title">
    <div className="container">
      <SectionHeader
        id="gallery-preview-title"
        eyebrow="Gallery"
        title="Life at AIC"
        lead="Workshops, demo days and everyday moments from the centre."
        aside={
          <Link to="/gallery" className="btn btn--outline">
            View gallery <i className="fa fa-arrow-right" aria-hidden="true" />
          </Link>
        }
      />
      <GalleryGrid limit={9} featured />
    </div>
  </section>
);

export default HomeGallery;
