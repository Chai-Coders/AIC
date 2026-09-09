import React from 'react';
import useApi from '../../hooks/useApi';
import { fetchAllGallery } from '../../api/content';

const GalleryGrid = () => {
  const { data: galleryItems, loading, error } = useApi(fetchAllGallery);

  return (
    <div id="contact" className="section md-padding">
      <div className="container-fluid">
        <div className="section-header text-center">
          <h2 className="title">Gallery</h2>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <i className="fa fa-spinner fa-spin fa-2x" />
            <p style={{ marginTop: '16px' }}>Loading gallery…</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>
            <i className="fa fa-exclamation-circle fa-2x" />
            <p style={{ marginTop: '12px' }}>Could not load gallery. Please try again later.</p>
          </div>
        )}

        {!loading && !error && galleryItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
            <p>No gallery items available yet.</p>
          </div>
        )}

        {!loading && !error && galleryItems.length > 0 && (
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
            {galleryItems.map((item) => (
              <div key={item.id} className="col-sm-4" style={{ marginBottom: '20px' }}>
                <div
                  className="contact"
                  style={{ overflow: 'hidden', borderRadius: '4px', border: '1px solid #eee' }}
                >
                  <a target="_blank" rel="noopener noreferrer" href={item.image}>
                    <img
                      className="logo"
                      src={item.image}
                      alt={item.subtext || `Gallery item ${item.id}`}
                      style={{
                        width: '100%',
                        height: '260px',
                        objectFit: 'cover',
                        transition: 'transform 0.3s',
                      }}
                    />
                  </a>
                  {item.subtext && (
                    <p
                      style={{
                        margin: '6px 8px',
                        fontSize: '13px',
                        color: '#555',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.subtext}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryGrid;
