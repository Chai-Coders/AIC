import React from 'react';

const startups = [
  { name: 'INFUSORY FUTURE TECH LABS PVT LTD', img: '/img/logo/Infusory.png' },
  { name: 'RRR GIG JOBS & SERVICES PRIVATE LIMITED', img: '/img/logo/RRR GIG JOBS _ SERVICES PRIVATE LIMITED.png' },
  { name: 'PROCIS BRAINLABS PRIVATE LIMITED', img: '/img/logo/Procis.png' },
  { name: 'DEEPQAI BUSINESS SOLUTIONS PRIVATE LIMITED', img: '/img/logo/DEEPQAI BUSINESS SOLUTIONS PRIVATE LIMITED.jpeg' },
  { name: 'DML INDUSTRIES PRIVATE LIMITED', img: '/img/logo/dml.jpg' },
  { name: 'PEOPLE REACHER PRIVATE LIMITED', img: '/img/logo/People Reacher.jpg' },
  { name: 'UPMARKET FINTECH SOLUTIONS INDIA PRIVATE LIMITED', img: '/img/logo/UPMARKET FINTECH SOLUTIONS INDIA PRIVATE LIMITED.png' },
  { name: 'WATER N SPICES FOODSZ PRIVATE LIMITED', img: '/img/logo/WATER N SPICES FOODSZ PRIVATE LIMITED.png' },
  { name: 'ETHNOGRAPHIC ART PRIVATE LIMITED', img: '/img/logo/Ethnographic Art.png' },
  { name: 'KIZHAKEDATHU TOURS AND TRAVELS PRIVATE LIMITED', img: '/img/logo/Kizhakedathu.png' },
  { name: 'AIGON MECHATRONICS PRIVATE LIMITED', img: '/img/logo/Aigon.png' },
  { name: 'BALUTEDAAR (OPC) PRIVATE LIMITED', img: '/img/logo/Balutedaar logo.png' },
  { name: 'BITTRON LABS PRIVATE LIMITED', img: '/img/logo/Bittron.png' },
  { name: 'BROWKU PRIVATE LIMITED', img: '/img/logo/browku new logo.jpeg' },
  { name: 'AMERALD CARE PRIVATE LIMITED', img: '/img/logo/AMERALD logo.png' },
  { name: 'ANSPRUCH TECHSOFT PRIVATE LIMITED', img: '/img/logo/Ansprunch logo.png' },
  { name: 'ECO BUGS INDIA PRIVATE LIMITED', img: '/img/logo/ecobugs.jpeg' },
  { name: 'UNVOICED MEDIA AND ENTERTAINMENT PVT LTD', img: '/img/logo/UME.jpg' },
  { name: 'FLUXFED TECHNOLOGIES PRIVATE LIMITED', img: '/img/logo/fluxfed_logo.jpeg' },
  { name: 'CUTTLFISH FITNESS (OPC) PRIVATE LIMITED', img: '/img/logo/Cuttlfish_logo.png' },
  { name: 'RUDRA DIGITAL MARKETING PRIVATE LIMITED', img: '/img/logo/RDM_Logo.png' },
  { name: 'TEAMSTARBASE PRIVATE LIMITED', img: '/img/logo/TeamStarBase.jpeg' },
  { name: 'FISCEAN TECHNOLOGIES PRIVATE LIMITED', img: '/img/logo/Fiscean.jpg' },
  { name: 'TROPHIC BIOSYSTEMS PRIVATE LIMITED', img: '/img/logo/tropic.png' },
  { name: 'KARDLE INDUSTRIES PRIVATE LIMITED', img: '/img/logo/kardle_logo.jpg' },
  { name: 'ASQUIRE GLOBAL FINANCIAL SOLUTIONS PRIVATE LIMITED', img: '/img/logo/Agfi- Logo.png' },
  { name: 'EDUHEX TECHNOLOGIES PRIVATE LIMITED', img: '/img/logo/eduhex.jpeg' },
  { name: 'CATALOG TECHNOLOGIES PRIVATE LIMITED', img: '/img/logo/catalog.jpeg' },
  { name: 'TECHNOACE CONSULTANCY SERVICES PRIVATE LIMITED', img: '/img/logo/technoace.jpeg' },
  { name: 'NEXPRESSION PRIVATE LIMITED', img: '/img/logo/nexpression logo.png' },
  { name: 'VAYANA MOBILITY PRIVATE LIMITED', img: '/img/logo/vayana.jpeg' },
  { name: 'PRINCE MANU BABY', img: '/img/logo/prince.jpeg' },
  { name: 'LUKA HEALTHCARE', img: '/img/logo/luka.jpeg' },
  { name: 'WINQQR', img: '/img/logo/winqqer.jpeg' },
  { name: 'NEXTGEN SM', img: '/img/logo/nextgen.jpeg' }
];

const partners = [
  { name: 'JioGenNext', img: '/img/partner/jio.png', link: 'https://www.jiogennext.com/' },
  { name: 'CCMB', img: '/img/partner/molecular.jpg', link: 'http://aic.ccmb.res.in/' },
  { name: 'SVPISTM', img: '/img/partner/svet.jpg', link: 'https://svpistm.ac.in/' },
  { name: 'SS Rana', img: '/img/partner/ssrana.png', link: 'https://www.ssrana.in/' },
  { name: 'AIC MUJ', img: '/img/partner/mai.png', link: 'https://www.aicmuj.com/' }
];

const StartupGrid = () => {
  return (
    <div className="container-fluid" style={{ padding: '40px 15px' }}>
      <div className="section-header text-center">
        <h2 className="title">Some of our promising Start-Ups</h2>
      </div>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {startups.map((item, idx) => (
          <div key={idx} className="col-sm-3" style={{ marginBottom: '30px' }}>
            <div className="contact" style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="slide" style={{ border: '1px solid #2C6EB0', height: '240px', width: '100%', maxWidth: '350px', padding: '10px', textAlign: 'center', background: '#fff', borderRadius: '6px' }}>
                <label style={{ color: 'black', fontSize: '13px', display: 'block', height: '40px', overflow: 'hidden' }}>{item.name}</label>
                <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={item.img} alt={item.name} style={{ maxHeight: '160px', maxWidth: '90%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partners section */}
      <div className="row" style={{ marginTop: '50px' }}>
        <div className="section-header text-center">
          <h2 className="title">Our partners</h2>
        </div>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {partners.map((partner, idx) => (
            <div key={idx} className="col-sm-2 text-center" style={{ marginBottom: '20px' }}>
              <a href={partner.link} target="_blank" rel="noopener noreferrer">
                <img src={partner.img} alt={partner.name} style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartupGrid;
