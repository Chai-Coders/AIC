import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import MentorGrid from '../components/sections/MentorGrid';

const MentorPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Our Mentors" 
        breadcrumbs={[{ label: 'Our Mentors' }]} 
      />
      <main>
        <MentorGrid />
      </main>
      <Footer />
    </>
  );
};

export default MentorPage;
