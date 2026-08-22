import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import BoardGrid from '../components/sections/BoardGrid';

const BoardMemberPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="Board of Governors" 
        breadcrumbs={[{ label: 'Board of Governors' }]} 
      />
      <main>
        <BoardGrid />
      </main>
      <Footer />
    </>
  );
};

export default BoardMemberPage;
