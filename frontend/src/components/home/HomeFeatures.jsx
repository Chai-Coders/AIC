import React, { useState, useEffect } from 'react';

const images = [
  '/img/about1.jpg',
  '/img/about2.jpg',
  '/img/about3.jpg',
  '/img/kiddo1.jpg',
  '/img/kiddo2.jpg',
  '/img/kiddo3.jpg',
  '/img/kiddo4.JPG'
];

const HomeFeatures = () => {
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="features" className="section md-padding bg-grey">
      <div className="container">
        <div className="row features-row">
          <div className="col-md-6">
            <div className="section-header">
              <h2 className="title features-title">Success Formula of AIC-IIITKottayam</h2>
            </div>
            <p>The success formula framed at AIC-IIITKottayam will include the following ingredients:</p>
            <div className="feature">
              <i className="fa fa-check"></i>
              <p>We keep our partners, including mentors, very close to our customers. <a href="https://goo.gl/forms/5BGUvajn6IoUryqF3" target="_blank" rel="noopener noreferrer">Apply Now</a> for recognition..</p>
            </div>
            <div className="feature">
              <i className="fa fa-check"></i>
              <p>The strength of the partners will be reaped in to the centre. For instance, IISER-TVM is a sort of knowledge park. We will include their strengths by directly connecting experts to our customers.</p>
            </div>
            <div className="feature">
              <i className="fa fa-check"></i>
              <p>We expand the networking (contacts) with the support of the proposed partners for attracting a few more customers in the long run.</p>
            </div>
            <div className="feature">
              <i className="fa fa-check"></i>
              <p>We inspire our partners and customers to submit a few innovative R&D projects so that the expertise level of AIC-IIITKottayam will be increased.</p>
            </div>
            <div className="feature">
              <i className="fa fa-check"></i>
              <p>We periodically verify and satisfy the existing customers so that they will remain as an indirect advertisement medium of the centre. <a href="https://goo.gl/forms/5BGUvajn6IoUryqF3" target="_blank" rel="noopener noreferrer">Apply Now</a> for recognition..</p>
            </div>
          </div>

          <div className="col-md-6">
            <div className="about-slider-wrapper" style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', minHeight: '350px' }}>
              <img
                className="img-responsive"
                src={images[currentImg]}
                alt="About slide"
                style={{ width: '100%', height: '380px', objectFit: 'cover', transition: 'all 0.5s ease-in-out' }}
              />
              <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center' }}>
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      margin: '0 4px',
                      borderRadius: '50%',
                      backgroundColor: currentImg === idx ? '#00b4d8' : '#fff',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeFeatures;
