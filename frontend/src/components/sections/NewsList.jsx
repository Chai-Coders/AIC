import React from 'react';
import { Link } from 'react-router-dom';

const NewsList = () => {
  const newsItems = [
    {
      text: 'Announcement: Watch ',
      linkText: 'RECRUITMENT NOTICE - 2025-26',
      link: '/careers.html'
    },
    {
      text: 'Announcement: Call for Non-Stipendary Internship: (2025-26 - Dec/May/June/July). If interested, send your CV with title "Non-Stipendary Internship-FY-25-26 (Summer)" to shajulin@iiitkottayam.ac.in, and incubate@iiitkottayam.ac.in Deadline: 25.12.25'
    },
    {
      text: 'IoT Cloud Analytics and Entrepreneurship Hackathon -- IEE-Hacks\'22 (An Indo-German Hackathon)',
      linkText: 'Learn More',
      link: '/hacks2022.html'
    },
    {
      text: 'Call for Nodal Centres Announced',
      linkText: 'View Details',
      link: '/pdfs/NodalCentre-Call-1.3.2022.pdf',
      isExternal: true
    },
    {
      text: 'AIC-IIITKottayam got selected for the SeedFund scheme of StartupIndia. The entrepreneurs/startups of AIC could receive seedfund via. our centre for their businesses.'
    },
    {
      text: 'Serve Nation as an Entrepreneur',
      linkText: 'Visit link',
      link: '/servenation.html'
    },
    {
      text: 'FridayStars',
      linkText: 'Visit link',
      link: '/FridayStars.html'
    },
    {
      text: 'Story Telling competition',
      linkText: 'Visit link',
      link: '/storyCovid19.html'
    },
    {
      text: 'Workshop on IoT Research and Effective Writing of Articles',
      linkText: 'Visit link',
      link: '/IoT21.html'
    },
    {
      text: 'ACM/CSI/IEEECS Research & Industry Symposium on IoT Cloud For Societal Applications (IoTCloud\'21)',
      linkText: 'Visit link',
      link: '/iotcloudsymp.html'
    }
  ];

  return (
    <div id="news" className="section sm-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title" style={{ color: '#777' }}>News and Updates -- AIC-IIITKottayam</h2>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          {newsItems.map((item, idx) => (
            <div key={idx} className="feature" style={{ marginBottom: '20px' }}>
              <i className="fa fa-check"></i>
              <p>
                {item.text}{' '}
                {item.link && (
                  item.isExternal ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">{item.linkText || item.link}</a>
                  ) : (
                    <Link to={item.link}>{item.linkText || item.link}</Link>
                  )
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsList;
