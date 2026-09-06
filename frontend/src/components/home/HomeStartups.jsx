import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

// Divide startups into 3 distinct horizontal rows
const row1 = startups.slice(0, 11);
const row2 = startups.slice(11, 22);
const row3 = startups.slice(22, 32);

const HomeStartups = () => {
  // Store currently active/clicked startup name or null
  const [activeStartup, setActiveStartup] = useState(null);
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const handleTileClick = (name, rowIndex) => {
    if (activeStartup === name) {
      setActiveStartup(null);
      setActiveRowIndex(null);
    } else {
      setActiveStartup(name);
      setActiveRowIndex(rowIndex);
    }
  };

  const renderRow = (rowItems, rowIndex, directionClass) => {
    const isRowPaused = activeRowIndex === rowIndex;
    // Duplicate items for seamless infinite marquee loop
    const displayItems = [...rowItems, ...rowItems];

    return (
      <div className="horizontal-slider-row">
        <div className={`horizontal-track ${directionClass} ${isRowPaused ? 'is-paused' : ''}`}>
          {displayItems.map((item, idx) => {
            const isActive = activeStartup === item.name;
            return (
              <div
                key={`${rowIndex}-${idx}-${item.name}`}
                className={`startup-tile ${isActive ? 'active-tile' : ''}`}
                onClick={() => handleTileClick(item.name, rowIndex)}
                title={item.name}
              >
                <img src={item.img} alt={item.name} loading="lazy" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="startups-building" className="section md-padding startups-section">
      <div className="container-fluid p-0">
        <div className="container">
          <div className="section-header-row">
            <div className="header-left">
              <span className="section-category">— PORTFOLIO</span>
              <h2 className="title">Startups Building with AIC</h2>
            </div>
            <div className="header-right">
              <p className="subtitle">Empowering high-growth tech ventures &amp; innovative entrepreneurs.</p>
              <Link to="/startup" className="view-portfolio-link">
                View All Startups <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="horizontal-scroll-container">
          {/* Gradient fade masks on left and right edges */}
          <div className="horizontal-mask left-mask"></div>
          <div className="horizontal-mask right-mask"></div>

          <div className="horizontal-rows-wrapper">
            {/* Row 1 - Left to Right */}
            {renderRow(row1, 1, 'track-left')}

            {/* Row 2 - Right to Left */}
            {renderRow(row2, 2, 'track-right')}

            {/* Row 3 - Left to Right */}
            {renderRow(row3, 3, 'track-left-alt')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeStartups;
