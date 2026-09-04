import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import SiaContent from '../components/sections/SiaContent';

const SiaPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Start-Up In AIC-IIITKottayam" 
        breadcrumbs={[{ label: 'SIA' }]} 
      />
      <main>
        <SiaContent />
      </main>
      <Footer />
    </>
  );
};

export default SiaPage;
