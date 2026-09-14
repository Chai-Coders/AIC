import React from 'react';
import { Link } from 'react-router-dom';

const HomeAbout = () => {
  return (
    <div id="about" className="section md-padding home-about-section" style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)' }}>
      <div className="container">
        <div className="row">
          <div className="section-header text-center col-xs-12" style={{ marginBottom: '52px' }}>
            <div style={{ width: '38px', height: '3.5px', backgroundColor: '#0284C7', borderRadius: '3px', margin: '0 auto 16px' }}></div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '2.5px', color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
              INNOVATE &bull; INCUBATE &bull; IMPACT
            </div>
            <h2 className="title" style={{ fontSize: 'clamp(2.4rem, 4vw, 3.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.6px', margin: '0 0 16px' }}>
              <span style={{ color: '#0284C7' }}>AIC-IIITKottayam</span> Incubation Centre
            </h2>
            <p className="about-section-description" style={{ color: '#64748B', fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>
              Nurturing ideas. Empowering innovators. Building a better tomorrow.
            </p>
          </div>
        </div>

        <div className="row flex-grid">
          {/* Card 1: Summary */}
          <div className="col-md-4 col-sm-6 flex-col">
            <div className="about-card">
              <div className="about-blob-bg about-blob-blue"></div>
              <div className="about-card-inner">
                <div>
                  <div className="about-card-header">
                    <div className="about-icon-circle about-icon-blue">
                      <i className="fa fa-file-text"></i>
                    </div>
                    <div className="about-title-wrap">
                      <h3 className="about-card-title">Summary</h3>
                      <div className="about-accent-line about-accent-blue"></div>
                    </div>
                  </div>
                  <p className="about-card-desc">
                    AIC-IIITKottayam is the incubation centre of Indian Institute of Information Technology Kottayam under AIM scheme of India.
                  </p>
                </div>

                <Link to="/summary" className="about-action-btn about-btn-blue">
                  Read more <i className="fa fa-arrow-right"></i>
                </Link>

                {/* Architectural / Incubator Building Watermark */}
                <svg className="about-watermark" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 120V40L80 10L140 40V120H20Z" stroke="#0284C7" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M80 10V120" stroke="#0284C7" strokeWidth="2" />
                  <path d="M40 50H60V70H40V50ZM100 50H120V70H100V50ZM40 85H60V105H40V85ZM100 85H120V105H100V85Z" stroke="#0284C7" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Team Members */}
          <div className="col-md-4 col-sm-6 flex-col">
            <div className="about-card">
              <div className="about-blob-bg about-blob-yellow"></div>
              <div className="about-card-inner">
                <div>
                  <div className="about-card-header">
                    <div className="about-icon-circle about-icon-yellow">
                      <i className="fa fa-users"></i>
                    </div>
                    <div className="about-title-wrap">
                      <h3 className="about-card-title">Team Members</h3>
                      <div className="about-accent-line about-accent-yellow"></div>
                    </div>
                  </div>
                  <p className="about-card-desc">
                    AIC-IIITKottayam centre is governed by leading industrialists and academicians of the globe ...
                  </p>
                </div>

                <Link to="/aicteam" className="about-action-btn about-btn-yellow">
                  Read more <i className="fa fa-arrow-right"></i>
                </Link>

                {/* Team Silhouettes Watermark */}
                <svg className="about-watermark" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="80" cy="50" r="20" fill="#EAB308" />
                  <path d="M45 110C45 88 60 78 80 78C100 78 115 88 115 110H45Z" fill="#EAB308" />
                  <circle cx="42" cy="60" r="14" fill="#EAB308" opacity="0.75" />
                  <path d="M18 110C18 94 28 86 42 86C49 86 55 89 59 95L50 110H18Z" fill="#EAB308" opacity="0.75" />
                  <circle cx="118" cy="60" r="14" fill="#EAB308" opacity="0.75" />
                  <path d="M142 110C142 94 132 86 118 86C111 86 105 89 101 95L110 110H142Z" fill="#EAB308" opacity="0.75" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: Sustainability */}
          <div className="col-md-4 col-sm-6 flex-col">
            <div className="about-card">
              <div className="about-blob-bg about-blob-blue"></div>
              <div className="about-card-inner">
                <div>
                  <div className="about-card-header">
                    <div className="about-icon-circle about-icon-blue">
                      <i className="fa fa-leaf"></i>
                    </div>
                    <div className="about-title-wrap">
                      <h3 className="about-card-title">Sustainability</h3>
                      <div className="about-accent-line about-accent-blue"></div>
                    </div>
                  </div>
                  <p className="about-card-desc">
                    AIC-IIITKottayam aims at sustainability while creating an ecosystem of entrepreneurs in IoT cloud domain...
                  </p>
                </div>

                <Link to="/summary" className="about-action-btn about-btn-blue">
                  Read more <i className="fa fa-arrow-right"></i>
                </Link>

                {/* Eco / Globe Leaves Watermark */}
                <svg className="about-watermark" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="115" cy="75" r="38" stroke="#0284C7" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M75 105C75 75 105 55 135 48C135 78 105 98 75 105Z" fill="#0284C7" opacity="0.6" />
                  <path d="M105 100C105 80 122 68 140 65C140 85 122 96 105 100Z" fill="#0284C7" opacity="0.45" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomeAbout;

