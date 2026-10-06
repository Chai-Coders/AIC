import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import useDocumentTitle from '../hooks/useDocumentTitle';
import HomeSlider from '../components/home/HomeSlider';
import HomeAbout from '../components/home/HomeAbout';
import HomeService from '../components/home/HomeService';
import HomeFeatures from '../components/home/HomeFeatures';
import HomeStartups from '../components/home/HomeStartups';
import HomeNews from '../components/home/HomeNews';
import HomePricing from '../components/home/HomePricing';
import HomeGallery from '../components/home/HomeGallery';
import HomeContact from '../components/home/HomeContact';

const HomePage = () => {
  useDocumentTitle();

  return (
    <>
      <Header transparent />
      <main id="main-content">
        <HomeSlider />
        <HomeAbout />
        <HomeService />
        <HomeFeatures />
        <HomeStartups />
        <HomeNews />
        <HomePricing />
        <HomeGallery />
        <HomeContact />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
