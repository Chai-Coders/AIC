import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import CareersContent from '../components/sections/CareersContent';

const CareersPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="AIC-IIITKottayam (Careers)" 
        breadcrumbs={[{ label: 'Careers' }]} 
      />
      <main>
        <CareersContent />
      </main>
      <Footer />
    </>
  );
};

export default CareersPage;
