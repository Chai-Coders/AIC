import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import HomeSlider from '../components/home/HomeSlider';
import HomeAbout from '../components/home/HomeAbout';
import HomeService from '../components/home/HomeService';
import HomeFeatures from '../components/home/HomeFeatures';
import HomeNumbers from '../components/home/HomeNumbers';
import HomePricing from '../components/home/HomePricing';
import HomeTestimonial from '../components/home/HomeTestimonial';
import HomeContact from '../components/home/HomeContact';

const HomePage = () => {
  return (
    <>
      <Header transparent={true} />
      <main>
        <HomeSlider />
        <HomeAbout />
        <HomeService />
        <HomeFeatures />
        <HomeNumbers />
        <HomePricing />
        <HomeTestimonial />
        <HomeContact />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
