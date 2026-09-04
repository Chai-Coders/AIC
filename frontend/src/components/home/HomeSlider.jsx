import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    image: '/img/slider/slider1.jpg',
    direction: 'slider-one',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'left'
  },
  {
    image: '/img/slider/slider2.jpg',
    direction: 'slider-two',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'center'
  },
  {
    image: '/img/slider/slider3.jpg',
    direction: 'slider-two',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'left'
  }
];

const HomeSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isAutoScrolling = useRef(false);
  const scrollIntentDelta = useRef(0);
  const resetDeltaTimer = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleWheel = (event) => {
      if (event.deltaY <= 0 || isAutoScrolling.current) {
        return;
      }

      const hero = document.querySelector('.home-hero');
      const aboutSection = document.getElementById('about');

      if (!hero || !aboutSection) {
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const heroDominantView = heroRect.top <= 0 && heroRect.bottom > window.innerHeight * 0.55;

      if (!heroDominantView) {
        scrollIntentDelta.current = 0;
        return;
      }

      scrollIntentDelta.current += event.deltaY;

      if (resetDeltaTimer.current) {
        window.clearTimeout(resetDeltaTimer.current);
      }

      resetDeltaTimer.current = window.setTimeout(() => {
        scrollIntentDelta.current = 0;
      }, 180);

      if (scrollIntentDelta.current < 170) {
        return;
      }

      event.preventDefault();
      isAutoScrolling.current = true;
      scrollIntentDelta.current = 0;

      const nav = document.getElementById('nav');
      const navOffset = nav ? nav.offsetHeight + 14 : 90;
      const targetTop = aboutSection.getBoundingClientRect().top + window.scrollY - navOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        isAutoScrolling.current = false;
      }, 1000);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (resetDeltaTimer.current) {
        window.clearTimeout(resetDeltaTimer.current);
      }
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const slide = slides[currentSlide];

  return (
    <div id="home" className="slider-area home-hero">
      <div className="home wrapper home-hero-wrapper">
        <div className="bend niceties preview-2">
          <div id="ensign-nivoslider" className="slides home-hero-media">
            <img
              src={slide.image}
              alt="Slide"
              className="home-hero-image"
            />
          </div>

          <div className={`slider-direction ${slide.direction} home-hero-overlay`}>
            <div className="container">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12">
                  <div className="slider-content home-hero-content text-center">
                    <div className="layer-1-1">
                      <h2 className="title1 home-hero-title1">{slide.title1}</h2>
                    </div>
                    <div className="layer-1-2">
                      <h1 className="title2 home-hero-title2">{slide.title2}</h1>
                      <p className="home-hero-description">
                        {slide.description}
                      </p>
                    </div>
                    <div className="layer-1-3 home-hero-actions">
                      <a className="ready-btn right-btn page-scroll" href="https://forms.gle/2c4NgmXp4B16zGet6" target="_blank" rel="noopener noreferrer">
                        Apply for Incubation
                      </a>
                      <Link className="ready-btn page-scroll" to="/summary.html">
                        Learn More
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider controls */}
          <div className="home-hero-dots">
            {slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`home-hero-dot ${currentSlide === idx ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSlider;
