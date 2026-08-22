import React from 'react';

const SiaContent = () => {
  return (
    <div id="news" className="section sm-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title" style={{ color: '#777' }}>Start-Up In AIC</h2>
          </div>
        </div>

        <p style={{ fontSize: '22px', lineHeight: '1.6' }}>
          AIC-IIIT Kottayam is inviting applications for its 1st cohort of SIA- Start-Up-In AIC.
          <br /> AIC(Atal Incubation Centre) IIIT Kottayam is a sec 8 non profit organization under AIM-NITI scheme of Government of India.
          <br /> SIA is a support scheme for budding entrepreneurs at AIC-IIIT Kottayam.
        </p>

        <h3 style={{ fontWeight: '700', marginTop: '28px', color: '#222' }}>KEY FEATURES</h3>
        <ul style={{ fontSize: '16px', lineHeight: '1.8', listStyleType: 'none', paddingLeft: 0 }}>
          <li>- Structured Launch Program in partnership with Global Leaders</li>
          <li>- Complete support from Idea Validation, Ip, Marketing, Seed funding and Acceleration.</li>
          <li>- Mentoring, Company Formation, Incubation facilities</li>
          <li>- Completely free company registration and incubation for selected teams*</li>
          <li>- 50+ member mentor panel of Global leaders in various domains</li>
          <li>- Virtual and Physical Incubation facilities</li>
          <li>- Office space, Prototyping labs, Makerspace</li>
          <li>- Support to ideas from all domains</li>
        </ul>

        <h3 style={{ fontWeight: '700', marginTop: '28px', color: '#222' }}>PROGRAM FLOW &amp; Engagements</h3>
        <ul style={{ fontSize: '16px', lineHeight: '1.8', listStyleType: 'none', paddingLeft: 0 }}>
          <li>- Application screening and cohort onboarding</li>
          <li>- Structured mentoring with domain experts and founders</li>
          <li>- Product validation, prototype support, and market readiness</li>
          <li>- Business model refinement with branding and go-to-market guidance</li>
          <li>- Demo readiness and investor/startup ecosystem connect</li>
        </ul>

        <h3 style={{ fontWeight: '700', marginTop: '28px', color: '#222' }}>EXPECTED OUTCOME</h3>
        <ul style={{ fontSize: '16px', lineHeight: '1.8', listStyleType: 'none', paddingLeft: 0 }}>
          <li>- Startup ideas transformed into validated business opportunities</li>
          <li>- Teams become investment and incubation ready</li>
          <li>- Stronger product-market fit with clearer growth roadmap</li>
          <li>- Entrepreneurial capability development for long-term scaling</li>
        </ul>

        <p style={{ fontStyle: 'italic', fontSize: '14px', marginTop: '15px' }}>*Stamp Duty and other Govt fees, if any are not included</p>

        <h3 style={{ fontWeight: '700', marginTop: '28px', color: '#222' }}>APPLICATION LINK</h3>
        <div className="feature" style={{ marginTop: '25px' }}>
          <p style={{ fontSize: '24px' }}>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScMg2bbHeF0wbV_feQlbAcHz1ro78PdpYNEwKni870ZSvl4mg/viewform" 
              target="_blank" 
              rel="noopener noreferrer"
              className="main-btn"
            >
              Apply Here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SiaContent;
