import React from 'react';
import useApi from '../../hooks/useApi';
import { fetchAllNews } from '../../api/content';

const NewsList = () => {
  const { data: newsItems, loading, error } = useApi(fetchAllNews);

  return (
    <div id="news" className="section sm-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title" style={{ color: '#777' }}>
              News and Updates -- AIC-IIITKottayam
            </h2>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <i className="fa fa-spinner fa-spin fa-2x" />
            <p style={{ marginTop: '16px' }}>Loading news…</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>
            <i className="fa fa-exclamation-circle fa-2x" />
            <p style={{ marginTop: '12px' }}>Could not load news. Please try again later.</p>
          </div>
        )}

        {!loading && !error && newsItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
            <p>No news items available yet.</p>
          </div>
        )}

        {!loading && !error && newsItems.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            {newsItems.map((item) => (
              <div key={item.id} className="feature" style={{ marginBottom: '20px' }}>
                <i className="fa fa-check" />
                <p>
                  {item.subtitle && (
                    <strong style={{ marginRight: '6px' }}>{item.subtitle}:</strong>
                  )}
                  {item.title}
                  {item.content && (
                    <span style={{ color: '#555', marginLeft: '6px' }}> — {item.content}</span>
                  )}
                  {item.published_date && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: '#999',
                      }}
                    >
                      ({item.published_date})
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsList;
