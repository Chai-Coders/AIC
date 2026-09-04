import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import GalleryGrid from '../components/sections/GalleryGrid';

const GalleryPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="AIC Incubation Centre Gallery" 
        breadcrumbs={[{ label: 'Gallery' }]} 
      />
      <main>
        <GalleryGrid />
      </main>
      <Footer />
    </>
  );
};

export default GalleryPage;
