import React from 'react';
import SectionHeader from '../common/SectionHeader';

const SERVICES = [
  {
    tag: 'Capability',
    title: 'Training & mentorship',
    desc: 'Practical and theoretical frameworks that upskill technical teams for product excellence.',
    chips: ['1-on-1 mentors', 'Tech labs'],
    variant: 'feature',
    photo: '/img/site/mentoring.jpg',
  },
  {
    tag: 'Protection',
    title: 'Patent & IP support',
    desc: 'Fast-track intellectual property guidance and filing with expert legal advisors and faculty.',
    chips: ['IP guidance', 'Prior-art search'],
  },
  {
    tag: 'Innovation',
    title: 'Idea generation hub',
    desc: 'Turning early concepts into market-ready prototypes through hackathons and ideation sprints.',
    chips: ['Hackathons', 'Prototyping'],
  },
  {
    tag: 'Growth',
    title: 'Marketing & go-to-market',
    desc: 'Sales strategy, PR and digital outreach to win early users and real market adoption.',
    chips: ['GTM strategy', 'Product launch'],
    variant: 'dark',
  },
  {
    tag: 'Credibility',
    title: 'Institutional backing',
    desc: 'The academic rigour and network of IIIT Kottayam, so investors and customers take you seriously.',
    chips: ['IIITK network', 'AIM, NITI Aayog'],
    variant: 'tint',
  },
  {
    tag: 'Network',
    title: 'Investor & global access',
    desc: 'Introductions to venture capitalists, angel networks and international trade bodies when you are ready to scale.',
    chips: ['Investor pitch days', 'Demo days'],
    variant: 'wide',
    photo: '/img/site/jury.jpg',
  },
];

const HomeService = () => (
  <section id="service" className="section section--white" aria-labelledby="service-title">
    <div className="container">
      <SectionHeader
        id="service-title"
        eyebrow="What you get"
        title="Everything a young company needs, under one roof"
        lead="Mentorship, rapid IP commercialisation and a trusted ecosystem for early-stage founders."
      />

      {/* Bento layout: one large photo tile, four squares and a wide strip (see .bento in home.css) */}
      <ul className="bento">
        {SERVICES.map((s, i) => (
          <li key={s.title} className={`bento__item ${s.variant ? `bento__item--${s.variant}` : ''}`}>
            {s.photo && <img className="bento__photo" src={s.photo} alt="" width="1600" height="1067" loading="lazy" />}
            <div className="bento__body">
              <p className="bento__tag">
                <span>{String(i + 1).padStart(2, '0')}</span>
                {s.tag}
              </p>
              <h3 className="bento__title">{s.title}</h3>
              <p className="bento__text">{s.desc}</p>
              <p className="bento__chips">{s.chips.join(' · ')}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default HomeService;
