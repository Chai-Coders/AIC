import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <>
      <footer id="footer" className="sm-padding bg-dark">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              {/* footer logo */}
              <div className="footer-logo">
                <Link to="/"><img src="/img/nlogo.png" alt="logo" /></Link>
              </div>
              {/* footer follow */}
              <ul className="footer-follow">
                <li><a href="https://www.facebook.com/aiciiitkottayam/" target="_blank" rel="noopener noreferrer"><i className="fa fa-facebook"></i></a></li>
                <li><a href="https://twitter.com/AICIIITKottayam" target="_blank" rel="noopener noreferrer"><i className="fa fa-twitter"></i></a></li>
                <li><a href="#google" onClick={(e) => e.preventDefault()}><i className="fa fa-google-plus"></i></a></li>
                <li><a href="https://www.instagram.com/aic.iiitkottayam/" target="_blank" rel="noopener noreferrer"><i className="fa fa-instagram"></i></a></li>
                <li><a href="https://www.linkedin.com/company/aic-iiitkottayam" target="_blank" rel="noopener noreferrer"><i className="fa fa-linkedin"></i></a></li>
                <li><a href="#youtube" onClick={(e) => e.preventDefault()}><i className="fa fa-youtube"></i></a></li>
              </ul>

              {/* footer copyright */}
              <div className="footer-copyright">
                <p>Copyright © 2019-2023. All Rights Reserved. Designed by IoT Cloud research team of IIIT Kottayam.</p>
                <div style={{ marginTop: '10px' }}>
                  <a href="http://www.hitwebcounter.com" target="_blank" rel="noopener noreferrer">
                    <img src="http://hitwebcounter.com/counter/counter.php?page=6952491&style=0007&nbdigits=5&type=page&initCount=0" title="Visitors" alt="Visitors" border="0" />
                  </a>
                  <br />
                  <a title="map" href="http://smallcounter.com/vmap/1527488886/" target="_blank" rel="noopener noreferrer">
                    <img title="map" src="http://smallcounter.com/map/view.php?type=180&id=1527488886" border="1" alt="map" />
                  </a>
                  <br />
                  <a href="http://smallcounter.com" target="_blank" rel="noopener noreferrer">AIC-IIITKottayam visitors</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top button */}
      <div 
        id="back-to-top" 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ cursor: 'pointer' }}
      ></div>
    </>
  );
};

export default Footer;
