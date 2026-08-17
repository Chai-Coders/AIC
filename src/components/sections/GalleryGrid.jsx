import React from 'react';

const galleryImages = [
  '/img/gal/2update/11.JPG',
  '/img/gal/2update/12.JPG',
  '/img/gal/2update/13.JPG',
  '/img/gal/2update/5.jpg',
  '/img/gal/2update/6.jpg',
  '/img/gal/2update/7.jpg',
  '/img/gal/2update/8.jpg',
  '/img/gal/2update/9.jpg',
  '/img/gal/2update/10.jpg',
  '/img/gal/2update/1.jpg',
  '/img/gal/2update/2.jpg',
  '/img/gal/2update/4.png',
  '/img/gal/update/10.jpg',
  '/img/gal/update/9.jpg',
  '/img/gal/update/11.jpg',
  '/img/gal/update/5.jpg',
  '/img/gal/update/6.jpg',
  '/img/gal/update/7.jpg',
  '/img/gal/update/1.jpg',
  '/img/gal/update/2.jpg',
  '/img/gal/update/4.jpg',
  '/img/gal/0Q1A5050.jpg',
  '/img/gal/0Q1A5064.jpg',
  '/img/gal/0Q1A5075.jpg',
  '/img/gal/0Q1A5081.jpg',
  '/img/gal/0Q1A5088.jpg',
  '/img/gal/0Q1A5090.jpg',
  '/img/gal/kiddo1.jpg',
  '/img/gal/kiddo2.jpg',
  '/img/gal/kiddo4.JPG',
  '/img/gal/women.jpg',
  '/img/gal/img1.jpg',
  '/img/gal/img2.jpg',
  '/img/gal/img3.JPG',
  '/img/gal/img4.JPG',
  '/img/gal/img5.JPG',
  '/img/gal/img19.jpg',
  '/img/gal/img7.jpg',
  '/img/gal/img8.jpg'
];

const GalleryGrid = () => {
  return (
    <div id="contact" className="section md-padding">
      <div className="container-fluid">
        <div className="section-header text-center">
          <h2 className="title">Gallery</h2>
        </div>

        <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
          {galleryImages.map((src, idx) => (
            <div key={idx} className="col-sm-4" style={{ marginBottom: '20px' }}>
              <div className="contact" style={{ overflow: 'hidden', borderRadius: '4px', border: '1px solid #eee' }}>
                <a target="_blank" rel="noopener noreferrer" href={src}>
                  <img 
                    className="logo" 
                    src={src} 
                    alt={`Gallery item ${idx + 1}`} 
                    style={{ width: '100%', height: '260px', objectFit: 'cover', transition: 'transform 0.3s' }} 
                  />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryGrid;
