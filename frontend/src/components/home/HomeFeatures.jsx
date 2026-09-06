import React from 'react';
import './HomeFeatures.css';

const FORM_URL = 'https://goo.gl/forms/5BGUvajn6IoUryqF3';

const milestones = [
  {
    num: '01',
    icon: 'fa fa-users',
    title: 'Strong Partnership Network',
    desc: 'We keep our partners, including mentors, very close to our customers.',
    apply: true,
    theme: 'blue'
  },
  {
    num: '02',
    icon: 'fa fa-map-marker',
    title: 'Reaching the Centre Directly',
    desc: 'The strength of the partners will be reaped in to the centre. For instance, IISER-TVM is a sort of knowledge park. We will include their strengths by directly connecting experts to our customers.',
    theme: 'green'
  },
  {
    num: '03',
    icon: 'fa fa-sitemap',
    title: 'Expanding the Network',
    desc: 'We expand the networking (contacts) with the support of the proposed partners for attracting a few more customers in the long run.',
    theme: 'purple'
  },
  {
    num: '04',
    icon: 'fa fa-lightbulb-o',
    title: 'Encouraging Innovation & R&D',
    desc: 'We inspire our partners and customers to submit a few innovative R&D projects so that the expertise level of AIC-IIITKottayam will be increased.',
    theme: 'rose'
  },
  {
    num: '05',
    icon: 'fa fa-shield',
    title: 'Continuous Verification',
    desc: 'We periodically verify and satisfy the existing customers so that they will remain as an indirect advertisement medium of the centre.',
    apply: true,
    theme: 'teal'
  }
];

const cards = [
  {
    img: '/img/background2.jpg',
    alt: 'IIIT Kottayam campus building',
    title: 'IIIT Kottayam Campus',
    tagline: 'Innovation • Research • Impact'
  },
  {
    img: '/img/about1.jpg',
    alt: 'IoT Cloud Societal Project banner',
    title: 'IoT Cloud Societal Project',
    tagline: 'Ideate • Develop • Deploy'
  },
  {
    img: '/img/gal/img7.jpg',
    alt: 'Mentors guiding founders at the incubation centre',
    title: 'Mentorship & Guidance',
    tagline: 'Learn • Build • Grow'
  },
  {
    img: '/img/about3.jpg',
    alt: 'R&D session at the incubation centre',
    title: 'R&D and Innovation',
    tagline: 'Research • Development • Solutions'
  }
];

const milestonePositions = [15, 32.5, 50, 67.5, 85];

const HomeFeatures = () => {
  return (
    <div id="features" className="section md-padding success-section">
      <div className="container">
        {/* Section Header */}
        <div className="success-header">
          <h2 className="success-title">
            Success Formula of <span className="success-title-accent">AIC-IIITKottayam</span>
          </h2>
          <p className="success-subtitle">
            The success formula framed at AIC-IIITKottayam will include the following ingredients:
          </p>
        </div>

        {/* Wavy Timeline Path with Milestones */}
        <div className="success-timeline">
          <svg
            className="success-path"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 60 C 60 10 120 10 180 60 C 240 110 330 110 390 60 C 450 10 540 10 600 60 C 660 110 750 110 810 60 C 870 10 960 10 1020 60 C 1080 110 1140 110 1200 60"
              fill="none"
              stroke="#0284C7"
              strokeWidth="4"
              strokeDasharray="10 10"
              strokeLinecap="round"
            />
          </svg>

          <div className="sf-end sf-start">
            <i className="fa fa-flag" aria-hidden="true"></i> START
          </div>

          {milestones.map((milestone, idx) => {
            const side = idx % 2 === 0 ? 'sf-top' : 'sf-bottom';
            return (
              <div
                key={milestone.num}
                className={`sf-milestone ${side}`}
                style={{ left: `${milestonePositions[idx]}%` }}
              >
                <div className={`sf-card sf-card-${milestone.theme}`}>
                  <div className="sf-card-head">
                    <span className="sf-badge">{milestone.num}</span>
                    <span className="sf-icon">
                      <i className={milestone.icon} aria-hidden="true"></i>
                    </span>
                  </div>
                  <h4 className="sf-title">{milestone.title}</h4>
                  <p className="sf-desc">
                    {milestone.desc}
                    {milestone.apply && (
                      <>
                        {' '}
                        <a
                          className="sf-apply"
                          href={FORM_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Apply Now
                        </a>{' '}
                        for recognition.
                      </>
                    )}
                  </p>
                </div>
                <span className="sf-stem" aria-hidden="true"></span>
                <span className="sf-dot" aria-hidden="true"></span>
              </div>
            );
          })}

          <div className="sf-end sf-finish">
            FINISH <i className="fa fa-flag-checkered" aria-hidden="true"></i>
          </div>
        </div>

        {/* Photo Cards */}
        <div className="success-cards">
          {cards.map((card) => (
            <figure className="success-card" key={card.title}>
              <img src={card.img} alt={card.alt} loading="lazy" />
              <figcaption>
                <h4>{card.title}</h4>
                <span>{card.tagline}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeFeatures;