import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';

const PROGRAMS = [
  {
    stage: 'Pre-incubation',
    title: 'Start-Up-In AIC',
    short: 'SIA',
    text: 'A structured launch programme for student innovators and pre-MVP teams, from idea validation and IP to company formation.',
    factLabel: 'Best for',
    fact: 'Idea to first prototype',
    to: '/sia',
  },
  {
    stage: 'Incubation & seed funding',
    title: 'Startup India Seed Fund',
    short: 'SISFS',
    text: 'Milestone-based funding for DPIIT-recognised startups to prove concepts, run product trials and enter the market.',
    factLabel: 'Funding',
    fact: 'Up to ₹50 lakh',
    to: '/sisfs',
    featured: true,
  },
  {
    stage: 'Acceleration',
    title: 'Scale-up programme',
    short: 'Acceleration',
    text: 'Strategic mentoring, partner networks, pilots and investor readiness for startups that are ready to grow.',
    factLabel: 'Best for',
    fact: 'Startups with traction',
    to: '/startup',
  },
];

const HomePrograms = () => (
  <section id="programmes" className="section" aria-labelledby="programmes-title">
    <div className="container">
      <SectionHeader
        id="programmes-title"
        eyebrow="Programmes"
        title={
          <>
            A path for every stage, <em>from idea to scale.</em>
          </>
        }
        lead="Join where you are today. Each programme hands you on to the next as your company grows."
      />

      <ol className="programs">
        {PROGRAMS.map((p, i) => (
          <li key={p.title} className={`program ${p.featured ? 'program--featured' : ''}`}>
            <p className="program__stage">
              <span>{String(i + 1).padStart(2, '0')}</span>
              {p.stage}
            </p>
            <h3 className="program__title">{p.title}</h3>
            <p className="program__text">{p.text}</p>
            <dl className="program__fact">
              <dt>{p.factLabel}</dt>
              <dd>{p.fact}</dd>
            </dl>
            <Link to={p.to} className="text-link stretched-link">
              About {p.short} <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HomePrograms;
