import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import StartupGrid from '../components/sections/StartupGrid';

const StartupPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Start-Ups of AIC-IIITKottayam" 
        breadcrumbs={[{ label: 'Our Start-ups' }]} 
      />
      <main>
        <StartupGrid />
      </main>
      <Footer />
    </>
  );
};

export default StartupPage;
