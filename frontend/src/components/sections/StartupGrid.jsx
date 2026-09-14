import React from 'react';
import useApi from '../../hooks/useApi';
import { fetchAllStartups } from '../../api/content';
import MemberCarousel from './MemberCarousel';

// Partners section has no API endpoint — stays static
const partners = [
  { name: 'JioGenNext', img: '/img/partner/jio.png', link: 'https://www.jiogennext.com/' },
  { name: 'CCMB', img: '/img/partner/molecular.jpg', link: 'http://aic.ccmb.res.in/' },
  { name: 'SVPISTM', img: '/img/partner/svet.jpg', link: 'https://svpistm.ac.in/' },
  { name: 'SS Rana', img: '/img/partner/ssrana.png', link: 'https://www.ssrana.in/' },
  { name: 'AIC MUJ', img: '/img/partner/mai.png', link: 'https://www.aicmuj.com/' },
];

const StartupGrid = () => {
  const { data: startups, loading, error } = useApi(fetchAllStartups);

  return (
    <div className="container-fluid" style={{ padding: '40px 15px' }}>
      {/* Static programme information styled like /sisfs */}
      <div className="container" style={{ maxWidth: '1140px', margin: '0 auto 40px' }}>
        {/* Intro Highlight Banner */}
        <div style={{ background: '#F8FAFC', padding: '24px 28px', borderRadius: '8px', borderLeft: '4px solid #0077B6', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155', margin: 0 }}>
            The <strong>AIC-IIITKottayam Acceleration Program</strong> empowers growth-stage and early-stage startups with dedicated mentoring, technical infrastructure, funding avenues, and strategic partner networks to accelerate their commercialization journey.
          </p>
        </div>

        {/* Grid of Key Features & Program Flow */}
        <div className="row" style={{ marginBottom: '24px' }}>
          <div className="col-md-6" style={{ marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
              <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <i className="fa fa-check-circle" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                KEY FEATURES
              </h4>
              <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                <li>Dedicated acceleration support for growth-stage startups</li>
                <li>Mentor network and expert interventions for scale-up challenges</li>
                <li>Access to partner ecosystem, industry connects, and market channels</li>
                <li>Strategic support in product, operations, and business expansion</li>
              </ul>
            </div>
          </div>

          <div className="col-md-6" style={{ marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
              <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <i className="fa fa-refresh" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                PROGRAM FLOW &amp; ENGAGEMENTS
              </h4>
              <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                <li>Startup selection based on growth potential and market readiness</li>
                <li>Goal setting with milestone-driven acceleration roadmap</li>
                <li>Periodic reviews with domain experts and seasoned business mentors</li>
                <li>Investor readiness, market access, and strategic partnership support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Grid of Expected Outcome & Support Ecosystem */}
        <div className="row" style={{ marginBottom: '24px' }}>
          <div className="col-md-6" style={{ marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
              <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <i className="fa fa-trophy" style={{ color: '#EAB308', marginRight: '10px' }}></i>
                EXPECTED OUTCOME
              </h4>
              <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                <li>Faster go-to-market and improved business traction</li>
                <li>Improved fundraising readiness and growth strategy execution</li>
                <li>Scalable operating model with stronger market presence</li>
                <li>Direct linkage with institutional investors and industry collaborators</li>
              </ul>
            </div>
          </div>

          <div className="col-md-6" style={{ marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
              <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                <i className="fa fa-rocket" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                ACCELERATION HIGHLIGHTS
              </h4>
              <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                <li>1-on-1 strategic growth mentorship sessions</li>
                <li>Dedicated cloud credits, prototyping labs, and testing setup</li>
                <li>Corporate tie-ups and pilot opportunities with partner network</li>
                <li>Access to AIM, DPIIT, SISFS and venture funding schemes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Application Link CTA Banner */}
        <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <h4 style={{ fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
            Ready to Accelerate Your Startup?
          </h4>
          <p style={{ fontSize: '15px', color: '#475569', marginBottom: '16px' }}>
            Join the AIC-IIITKottayam Acceleration Program and fast-track your scale-up journey.
          </p>
          <a
            href="https://forms.gle/2c4NgmXp4B16zGet6"
            target="_blank"
            rel="noopener noreferrer"
            className="main-btn"
            style={{ display: 'inline-block', padding: '10px 28px', fontSize: '15px' }}
          >
            Apply for Acceleration Program <i className="fa fa-external-link" style={{ marginLeft: '8px' }}></i>
          </a>
        </div>
      </div>

      {/* Dynamic startups from API */}
      <div className="section-header text-center">
        <h2 className="title">Some of our promising Start-Ups</h2>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
          <i className="fa fa-spinner fa-spin fa-2x" />
          <p style={{ marginTop: '16px' }}>Loading startups…</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>
          <i className="fa fa-exclamation-circle fa-2x" />
          <p style={{ marginTop: '12px' }}>Could not load startups. Please try again later.</p>
        </div>
      )}

      {!loading && !error && startups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
          <p>No startups listed yet.</p>
        </div>
      )}

      {!loading && !error && startups.length > 0 && (
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {startups.map((item) => (
            <div key={item.id} className="col-sm-3" style={{ marginBottom: '30px' }}>
              <div className="contact" style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  className="slide"
                  style={{
                    border: '1px solid #2C6EB0',
                    height: '240px',
                    width: '100%',
                    maxWidth: '350px',
                    padding: '10px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '6px',
                  }}
                >
                  <label
                    style={{
                      color: 'black',
                      fontSize: '13px',
                      display: 'block',
                      height: '40px',
                      overflow: 'hidden',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </label>
                  <div
                    style={{
                      height: '170px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.website_url ? (
                      <a href={item.website_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.logo_or_image}
                          alt={item.name}
                          style={{ maxHeight: '160px', maxWidth: '90%', objectFit: 'contain' }}
                        />
                      </a>
                    ) : (
                      <img
                        src={item.logo_or_image}
                        alt={item.name}
                        style={{ maxHeight: '160px', maxWidth: '90%', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Static partners section */}
      <div className="row" style={{ marginTop: '50px' }}>
        <div className="section-header text-center">
          <h2 className="title">Our partners</h2>
        </div>
        <div
          className="row"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {partners.map((partner, idx) => (
            <div key={idx} className="col-sm-2 text-center" style={{ marginBottom: '20px' }}>
              <a href={partner.link} target="_blank" rel="noopener noreferrer">
                <img
                  src={partner.img}
                  alt={partner.name}
                  style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartupGrid;
