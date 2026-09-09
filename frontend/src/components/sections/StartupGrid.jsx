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
      {/* Static programme information */}
      <div className="row" style={{ maxWidth: '1100px', margin: '0 auto 40px' }}>
        <div className="col-md-12">
          <h3 style={{ fontWeight: '700', color: '#222', marginTop: '0' }}>KEY FEATURES</h3>
          <ul style={{ color: '#333', fontSize: '16px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Dedicated acceleration support for growth-stage startups</li>
            <li>Mentor network and expert interventions for scale-up challenges</li>
            <li>Access to partner ecosystem, industry connects, and market channels</li>
            <li>Strategic support in product, operations, and business expansion</li>
          </ul>

          <h3 style={{ fontWeight: '700', color: '#222', marginTop: '26px' }}>
            PROGRAM FLOW &amp; Engagements
          </h3>
          <ul style={{ color: '#333', fontSize: '16px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Startup selection based on growth potential and readiness</li>
            <li>Goal setting with milestone-driven acceleration roadmap</li>
            <li>Periodic reviews with domain experts and business mentors</li>
            <li>Investor readiness, market access, and strategic partnership support</li>
          </ul>

          <h3 style={{ fontWeight: '700', color: '#222', marginTop: '26px' }}>EXPECTED OUTCOME</h3>
          <ul style={{ color: '#333', fontSize: '16px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Faster go-to-market and improved business traction</li>
            <li>Improved fundraising readiness and growth strategy execution</li>
            <li>Scalable operating model with stronger market presence</li>
          </ul>

          <h3 style={{ fontWeight: '700', color: '#222', marginTop: '26px' }}>APPLICATION LINK</h3>
          <p style={{ marginBottom: '0' }}>
            <a
              href="https://forms.gle/2c4NgmXp4B16zGet6"
              target="_blank"
              rel="noopener noreferrer"
              className="main-btn"
            >
              Apply for Acceleration Program
            </a>
          </p>
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
