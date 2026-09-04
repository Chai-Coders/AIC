import React from 'react';
import './HomeStartups.css';

const startups = [
  { name: 'Infusory Future Tech Labs', img: '/img/logo/Infusory.png' },
  { name: 'RRR Gig Jobs & Services', img: '/img/logo/RRR GIG JOBS _ SERVICES PRIVATE LIMITED.png' },
  { name: 'Procis Brainlabs', img: '/img/logo/Procis.png' },
  { name: 'DeepQAI Business Solutions', img: '/img/logo/DEEPQAI BUSINESS SOLUTIONS PRIVATE LIMITED.jpeg' },
  { name: 'DML Industries', img: '/img/logo/dml.jpg' },
  { name: 'People Reacher', img: '/img/logo/People Reacher.jpg' },
  { name: 'Upmarket Fintech Solutions', img: '/img/logo/UPMARKET FINTECH SOLUTIONS INDIA PRIVATE LIMITED.png' },
  { name: 'Water N Spices Foodsz', img: '/img/logo/WATER N SPICES FOODSZ PRIVATE LIMITED.png' },
  { name: 'Ethnographic Art', img: '/img/logo/Ethnographic Art.png' },
  { name: 'Kizhakedathu Tours & Travels', img: '/img/logo/Kizhakedathu.png' },
  { name: 'Aigon Mechatronics', img: '/img/logo/Aigon.png' },
  { name: 'Balutedaar', img: '/img/logo/Balutedaar logo.png' },
  { name: 'Bittron Labs', img: '/img/logo/Bittron.png' },
  { name: 'Browku', img: '/img/logo/browku new logo.jpeg' },
  { name: 'Amerald Care', img: '/img/logo/AMERALD logo.png' },
  { name: 'Anspruch Techsoft', img: '/img/logo/Ansprunch logo.png' },
  { name: 'Eco Bugs India', img: '/img/logo/ecobugs.jpeg' },
  { name: 'Unvoiced Media & Entertainment', img: '/img/logo/UME.jpg' },
  { name: 'Fluxfed Technologies', img: '/img/logo/fluxfed_logo.jpeg' },
  { name: 'Cuttlfish Fitness', img: '/img/logo/Cuttlfish_logo.png' },
  { name: 'Rudra Digital Marketing', img: '/img/logo/RDM_Logo.png' },
  { name: 'TeamStarBase', img: '/img/logo/TeamStarBase.jpeg' },
  { name: 'Fiscean Technologies', img: '/img/logo/Fiscean.jpg' },
  { name: 'Trophic Biosystems', img: '/img/logo/tropic.png' },
  { name: 'Kardle Industries', img: '/img/logo/kardle_logo.jpg' },
  { name: 'Asquire Global Financial', img: '/img/logo/Agfi- Logo.png' },
  { name: 'Eduhex Technologies', img: '/img/logo/eduhex.jpeg' },
  { name: 'Catalog Technologies', img: '/img/logo/catalog.jpeg' },
  { name: 'Technoace Consultancy', img: '/img/logo/technoace.jpeg' },
  { name: 'Nexpression', img: '/img/logo/nexpression logo.png' },
  { name: 'Vayana Mobility', img: '/img/logo/vayana.jpeg' },
  { name: 'Luka Healthcare', img: '/img/logo/luka.jpeg' }
];

// Divide startups into 3 distinct columns for vertical scrolling
const col1 = startups.slice(0, 11);
const col2 = startups.slice(11, 22);
const col3 = startups.slice(22, 32);

const HomeStartups = () => {
  return (
    <div id="startups-building" className="section md-padding startups-section">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">Startups Building with AIC</h2>
            <p className="subtitle">Empowering high-growth tech ventures &amp; innovative entrepreneurs</p>
          </div>
        </div>

        <div className="vertical-scroll-container">
          <div className="vertical-scroll-mask"></div>

          <div className="row vertical-scroll-columns">
            {/* Column 1 - Scroll Up */}
            <div className="col-md-4 col-sm-4 col-xs-12 vertical-scroll-col">
              <div className="vertical-track track-up">
                {[...col1, ...col1].map((item, idx) => (
                  <div key={idx} className="startup-vertical-card">
                    <div className="startup-logo-wrapper">
                      <img src={item.img} alt={item.name} />
                    </div>
                    <div className="startup-info">
                      <h4>{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2 - Scroll Down */}
            <div className="col-md-4 col-sm-4 col-xs-12 vertical-scroll-col hidden-xs">
              <div className="vertical-track track-down">
                {[...col2, ...col2].map((item, idx) => (
                  <div key={idx} className="startup-vertical-card">
                    <div className="startup-logo-wrapper">
                      <img src={item.img} alt={item.name} />
                    </div>
                    <div className="startup-info">
                      <h4>{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3 - Scroll Up */}
            <div className="col-md-4 col-sm-4 col-xs-12 vertical-scroll-col hidden-xs">
              <div className="vertical-track track-up-slow">
                {[...col3, ...col3].map((item, idx) => (
                  <div key={idx} className="startup-vertical-card">
                    <div className="startup-logo-wrapper">
                      <img src={item.img} alt={item.name} />
                    </div>
                    <div className="startup-info">
                      <h4>{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeStartups;
