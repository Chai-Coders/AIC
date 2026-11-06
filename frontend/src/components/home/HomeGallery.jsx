import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import GalleryGrid from '../sections/GalleryGrid';
import { Text } from '../../content/Text';

const HomeGallery = () => (
  <section id="gallery-preview" className="section section--rule" aria-labelledby="gallery-preview-title">
    <div className="container">
      <SectionHeader
        id="gallery-preview-title"
        prefix="home.gallery"
        aside={
          <Link to="/gallery" className="btn btn--outline">
            <Text k="home.gallery.button" /> <i className="fa fa-arrow-right" aria-hidden="true" />
          </Link>
        }
      />
      <GalleryGrid limit={9} featured />
    </div>
  </section>
);

export default HomeGallery;
