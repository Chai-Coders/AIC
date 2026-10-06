import React, { useEffect, useRef, useState } from 'react';
import SectionHeader from '../common/SectionHeader';

const SERVICES = [
  {
    icon: 'fa-graduation-cap',
    tag: 'Capability',
    title: 'Training & Mentorship',
    desc: 'Curated practical and theoretical frameworks to upskill technical teams for product excellence.',
    chips: ['1-on-1 mentors', 'Tech labs'],
  },
  {
    icon: 'fa-certificate',
    tag: 'Protection',
    title: 'Patent & IP Support',
    desc: 'Fast-track intellectual property guidance and filing with expert legal advisors and faculty.',
    chips: ['IP guidance', 'Prior-art search'],
  },
  {
    icon: 'fa-lightbulb-o',
    tag: 'Innovation',
    title: 'Idea Generation Hub',
    desc: 'Transforming nascent concepts into market-ready prototypes via hackathons and ideation sprints.',
    chips: ['Hackathons', 'Prototyping'],
  },
  {
    icon: 'fa-line-chart',
    tag: 'Growth',
    title: 'Marketing & GTM',
    desc: 'Strategic sales, PR, and digital outreach to ensure wide user adoption and market penetration.',
    chips: ['GTM strategy', 'Product launch'],
  },
  {
    icon: 'fa-university',
    tag: 'Prestige',
    title: 'Institutional Credibility',
    desc: 'Leveraging the academic rigour and network trust of IIIT Kottayam to build founder credibility with investors.',
    chips: ['IIITK heritage', 'NITI Aayog recognised'],
  },
  {
    icon: 'fa-globe',
    tag: 'Network',
    title: 'Global Visibility',
    desc: 'Direct introductions to venture capitalists, angel networks and international trade bodies to help startups scale.',
    chips: ['Investor pitch days', 'Demo days'],
  },
];

const STATS = [
  { icon: 'fa-rocket', value: 42, label: 'Startups supported' },
  { icon: 'fa-briefcase', value: 141, label: 'Jobs created' },
  { icon: 'fa-paper-plane', value: 12, label: 'Submissions' },
  { icon: 'fa-certificate', value: 11, label: 'IPs generated' },
];

// Counts up from 0 the first time the number scrolls into view.
const AnimatedCounter = ({ target, duration = 1800 }) => {
  const ref = useRef(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      setCount(target);
      return undefined;
    }

    let frame;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start;
        const step = (now) => {
          start ??= now;
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.round((1 - (1 - progress) ** 3) * target));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  return (
    <span ref={ref} aria-label={String(target)}>
      {count}
    </span>
  );
};

const HomeService = () => (
  <>
    <section id="service" className="section" aria-labelledby="service-title">
      <div className="container">
        <SectionHeader
          id="service-title"
          eyebrow="What we offer"
          title={
            <>
              Our <span className="accent">value proposition</span>
            </>
          }
          lead="Comprehensive mentorship, rapid IP commercialisation and a trusted ecosystem for early-stage founders."
        />

        <div className="grid grid--3">
          {SERVICES.map((s, i) => (
            <article key={s.title} className="card card--hover service-card">
              <div className="service-card__top">
                <span className={`icon-badge ${i % 2 ? 'icon-badge--accent' : ''}`}>
                  <i className={`fa ${s.icon}`} aria-hidden="true" />
                </span>
                <span className="chip">{s.tag}</span>
              </div>
              <h3 className="card__title">{s.title}</h3>
              <p className="card__text">{s.desc}</p>
              <ul className="service-card__chips">
                {s.chips.map((c) => (
                  <li key={c} className="chip chip--primary">
                    {c}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="section section--dark impact" aria-labelledby="impact-title">
      <div className="container impact__inner">
        <div className="impact__copy">
          <p className="eyebrow">Our impact</p>
          <h2 id="impact-title" className="section-title">
            Key ecosystem <span className="accent">achievements</span>
          </h2>
          <p className="section-lead">
            Verified milestones from the startups and innovators we have backed since the centre was founded.
          </p>
        </div>
        <dl className="impact__stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="impact__stat">
              <dt>
                <i className={`fa ${stat.icon}`} aria-hidden="true" />
                {stat.label}
              </dt>
              <dd>
                <AnimatedCounter target={stat.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  </>
);

export default HomeService;
