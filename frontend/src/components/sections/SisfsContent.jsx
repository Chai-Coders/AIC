import React from 'react';

const SisfsContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-9">
            <div className="blog">
              <div className="blog-content">
                <h2>Startup India Seed Fund Scheme (SISFS)</h2>
                <p style={{ fontSize: '16px', color: '#333' }}>
                  AIC IIIT KOTTAYAM Foundation is selected under SISFS (Startup India Seed Fund Scheme) in 2021. SISFS is a government initiative with a stated objective to build a strong ecosystem for nurturing innovation and start-ups in the country that would drive sustainable economic growth and generate large scale employment opportunities. A startup will be eligible to get an amount up to 50 Lakh INR. AIC IIITK is building a start-up ecosystem which builds a bridge between the entrepreneurs and innovation from local to national and international market.
                </p>

                <h4 style={{ color: '#000', fontWeight: 'bold', marginTop: '24px' }}>KEY FEATURES</h4>
                <ul style={{ color: '#333', paddingLeft: '20px', fontSize: '15px' }}>
                  <li>Proof of concept</li>
                  <li>Prototype development</li>
                  <li>Product trials</li>
                  <li>Market entry</li>
                  <li>Commercialization</li>
                </ul>

                <h4 style={{ color: '#000', fontWeight: 'bold', marginTop: '24px' }}>PROGRAM FLOW &amp; Engagements</h4>
                <ul style={{ color: '#333', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.7' }}>
                  <li>Startup application and eligibility review</li>
                  <li>Screening, due diligence, and selection by expert committee</li>
                  <li>Milestone-based support through mentoring and reviews</li>
                  <li>Fund utilization for validation, trials, and commercialization</li>
                  <li>Periodic reporting and progress evaluation through incubator</li>
                </ul>

                <p style={{ fontSize: '16px', color: '#333' }}>
                  The aim of this scheme is to provide financial assistance to start-ups via corpus of INR 945 crore that will be disbursed through selected incubators across India in 2021-25.
                </p>

                <h4 style={{ color: '#000', fontWeight: 'bold', marginTop: '24px' }}>EXPECTED OUTCOME</h4>
                <ul style={{ color: '#333', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.7' }}>
                  <li>Early stage startups move from concept to market-ready offerings</li>
                  <li>Improved commercialization pipeline through milestone support</li>
                  <li>Job creation and sustainable innovation-led growth</li>
                  <li>Increased access to market and investor opportunities</li>
                </ul>

                <h4 style={{ color: '#000', fontWeight: 'bold', marginTop: '20px' }}>Eligibility criteria for a startup:</h4>
                <ol style={{ color: '#333', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.7' }}>
                  <li>Any startup recognized by DPIIT incorporated under 2 years at application time.</li>
                  <li>Must have a business idea with market fit, viable commercialization, and scale.</li>
                  <li>Using technology in core product/service/business model.</li>
                  <li>Preference given to social impact, waste/water management, edtech, agritech, healthcare, energy, robotics, etc.</li>
                  <li>Must not have received more than INR 10 lakh of monetary support under any other Central/State Govt scheme.</li>
                  <li>At least 51% shareholding by Indian promoters.</li>
                </ol>

                <div style={{ marginTop: '25px' }}>
                  <h4 style={{ fontWeight: 'bold' }}>APPLICATION LINK</h4>
                  <a href="https://seedfund.startupindia.gov.in/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    https://seedfund.startupindia.gov.in/
                  </a>
                </div>
              </div>
            </div>
          </main>

          <aside id="aside" className="col-md-3">
            <div className="widget">
              <div className="widget-category">
                <img src="/img/seed_scheme1.jpg" alt="Seed Scheme 1" style={{ width: '100%', marginBottom: '15px', borderRadius: '4px' }} />
              </div>
            </div>
            <div className="widget">
              <div className="widget-category">
                <img src="/img/seed_scheme2.jpg" alt="Seed Scheme 2" style={{ width: '100%', borderRadius: '4px' }} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SisfsContent;
