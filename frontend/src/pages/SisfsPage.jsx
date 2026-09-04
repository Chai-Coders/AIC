import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import SisfsContent from '../components/sections/SisfsContent';

const SisfsPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Startup India Seed Fund Scheme (SISFS)" 
        breadcrumbs={[{ label: 'SISFS' }]} 
      />
      <main>
        <SisfsContent />
      </main>
      <Footer />
    </>
  );
};

export default SisfsPage;
