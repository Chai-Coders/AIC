import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div id="home" className="slider-area">
      <div className="home wrapper" style={{ position: 'relative', overflow: 'hidden', minHeight: '550px' }}>
        <div className="bend niceties preview-2">
          <div id="ensign-nivoslider" className="slides" style={{ position: 'relative', width: '100%', height: '550px' }}>
            <img 
              src={slide.image} 
              alt="Slide" 
              style={{ width: '100%', height: '550px', objectFit: 'cover', transition: 'all 0.8s ease-in-out' }} 
            />
          </div>

          <div className={`slider-direction ${slide.direction}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center' }}>
            <div className="container">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12">
                  <div className={`slider-content ${slide.align === 'center' ? 'text-center' : ''}`}>
                    <div className="layer-1-1">
                      <h2 className="title1" style={{ color: '#fff', fontSize: '36px', fontWeight: 'bold' }}>{slide.title1}</h2>
                    </div>
                    <div className="layer-1-2">
                      <h1 className="title2" style={{ color: '#fff', fontSize: '48px', fontWeight: 'bold' }}>{slide.title2}</h1>
                      <p style={{ color: '#eee', fontSize: '16px', whiteSpace: 'pre-line', marginTop: '10px' }}>
                        {slide.description}
                      </p>
                    </div>
                    <div className="layer-1-3" style={{ marginTop: '25px' }}>
                      <a className="ready-btn right-btn page-scroll" href="https://forms.gle/2c4NgmXp4B16zGet6" target="_blank" rel="noopener noreferrer" style={{ marginRight: '15px' }}>
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
          <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', zIndex: 10 }}>
            {slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  margin: '0 5px',
                  borderRadius: '50%',
                  backgroundColor: currentSlide === idx ? '#00b4d8' : '#fff',
                  cursor: 'pointer',
                  opacity: currentSlide === idx ? 1 : 0.6
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSlider;
