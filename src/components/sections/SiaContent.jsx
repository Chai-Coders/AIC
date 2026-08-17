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

        <p style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '18px', marginTop: '20px' }}>Features:</p>
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

        <p style={{ fontStyle: 'italic', fontSize: '14px', marginTop: '15px' }}>*Stamp Duty and other Govt fees, if any are not included</p>
        
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
