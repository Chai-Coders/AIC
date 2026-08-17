import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import TeamGrid from '../components/sections/TeamGrid';

const AicTeamPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Our Team" 
        breadcrumbs={[{ label: 'Our Team' }]} 
      />
      <main>
        <TeamGrid />
      </main>
      <Footer />
    </>
  );
};

export default AicTeamPage;
