import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <>
      <footer id="footer" className="aic-footer">
        <div className="aic-footer-main">
          <div className="aic-footer-brand">
            <ul className="footer-follow" aria-label="Social media links">
              <li><a href="https://www.facebook.com/aiciiitkottayam/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fa fa-facebook"></i></a></li>
              <li><a href="https://twitter.com/AICIIITKottayam" target="_blank" rel="noopener noreferrer" aria-label="X"><span className="footer-x" aria-hidden="true">X</span></a></li>
              <li><a href="https://www.linkedin.com/company/aic-iiitkottayam" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fa fa-linkedin"></i></a></li>
              <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i className="fa fa-youtube-play"></i></a></li>
              <li><a href="https://www.instagram.com/aic.iiitkottayam/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fa fa-instagram"></i></a></li>
            </ul>
            <h2>Get in <span>Touch</span></h2>
            <Link className="footer-contact-link" to="/#contact">Contact Us</Link>
          </div>

          <div className="aic-footer-links">
            <h3>Quick Links</h3>
            <div className="footer-link-columns">
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/summary.html">NSRCEL at a Glance</Link></li>
                <li><Link to="/aicteam.html">People &amp; Culture</Link></li>
                <li><Link to="/SIA.html">Programs</Link></li>
                <li><Link to="/startup.html">Portfolio</Link></li>
              </ul>
              <ul>
                <li><Link to="/news.html">News &amp; Media</Link></li>
                <li><Link to="/SIA.html">Insights</Link></li>
                <li><Link to="/mentor.html">Mentors</Link></li>
                <li><Link to="/careers.html">Careers</Link></li>
                <li><Link to="/gallery.html">Gallery</Link></li>
              </ul>
            </div>
          </div>

          <div className="aic-footer-contact">
            <p><i className="fa fa-map-marker"></i>Building no. 340,<br />Karoor Valavoor P.O.,<br />Kottayam, Kerala 686635.</p>
            <a href="mailto:incubate@iiitkottayam.ac.in"><i className="fa fa-envelope"></i>incubate@iiitkottayam.ac.in</a>
            <a href="mailto:ceo-aic@iiikottayam.ac.in"><i className="fa fa-envelope"></i>ceo-aic@iiikottayam.ac.in</a>
            <a href="tel:+914822202156"><i className="fa fa-phone"></i>+91-482-2202156</a>
            <a href="tel:+914822202155"><i className="fa fa-phone"></i>+91-482-2202155</a>
            <a href="tel:+919400063494"><i className="fa fa-phone"></i>+91-9400063494</a>
            <a href="tel:+919443543746"><i className="fa fa-phone"></i>+91-9443543746</a>
          </div>
        </div>

        <div className="aic-footer-bottom">
          <p>Copyright &copy; 2026 AIC-IIIT Kottayam. All Rights Reserved.</p>
        </div>
      </footer>

      <button
        id="back-to-top"
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="fa fa-angle-up"></i>
      </button>
    </>
  );
};

export default Footer;
