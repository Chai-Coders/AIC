import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HeaderBanner from '../components/common/HeaderBanner';
import NewsList from '../components/sections/NewsList';

const NewsPage = () => {
  return (
    <>
      <Header />
      <HeaderBanner 
        title="News and Updates - AIC-IIITKottayam" 
        breadcrumbs={[{ label: 'News' }]} 
      />
      <main>
        <NewsList />
      </main>
      <Footer />
    </>
  );
};

export default NewsPage;
