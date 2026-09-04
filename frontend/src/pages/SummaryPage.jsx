import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import SummaryContent from '../components/sections/SummaryContent';

const SummaryPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="IoT-Cloud Societal (AIC-IIITKottayam)" 
        breadcrumbs={[{ label: 'Summary' }]} 
      />
      <main>
        <SummaryContent />
      </main>
      <Footer />
    </>
  );
};

export default SummaryPage;
