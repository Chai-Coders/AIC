import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './HomeStartups.css';
import useApi from '../../hooks/useApi';
import { fetchAllStartups } from '../../api/content';

const HomeStartups = () => {
  const { data: startups, loading, error } = useApi(fetchAllStartups);

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

  // Divide startups into 3 rows dynamically
  const { row1, row2, row3 } = useMemo(() => {
    if (startups.length === 0) return { row1: [], row2: [], row3: [] };
    const third = Math.ceil(startups.length / 3);
    return {
      row1: startups.slice(0, third),
      row2: startups.slice(third, third * 2),
      row3: startups.slice(third * 2),
    };
  }, [startups]);

  const renderRow = (rowItems, rowIndex, directionClass) => {
    if (rowItems.length === 0) return null;
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
                key={`${rowIndex}-${idx}-${item.id}`}
                className={`startup-tile ${isActive ? 'active-tile' : ''}`}
                onClick={() => handleTileClick(item.name, rowIndex)}
                title={item.name}
              >
                <img src={item.logo_or_image} alt={item.name} loading="lazy" />
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <i className="fa fa-spinner fa-spin fa-2x" />
            <p style={{ marginTop: '16px' }}>Loading startups…</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>
            <i className="fa fa-exclamation-circle fa-2x" />
            <p style={{ marginTop: '12px' }}>Could not load startups.</p>
          </div>
        )}

        {!loading && !error && startups.length > 0 && (
          <div className="horizontal-scroll-container">
            {/* Gradient fade masks on left and right edges */}
            <div className="horizontal-mask left-mask" />
            <div className="horizontal-mask right-mask" />

            <div className="horizontal-rows-wrapper">
              {/* Row 1 - Left to Right */}
              {renderRow(row1, 1, 'track-left')}

              {/* Row 2 - Right to Left */}
              {renderRow(row2, 2, 'track-right')}

              {/* Row 3 - Left to Right */}
              {renderRow(row3, 3, 'track-left-alt')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeStartups;
