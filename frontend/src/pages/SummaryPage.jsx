import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import { CtaBanner, InfoCard } from '../components/sections/ProgramContent';
import { APPLY_URL, HOST_INSTITUTE_URL } from '../data/site';

const PILLARS = [
  { icon: 'fa-cube', title: 'Rapid prototyping', text: '3D printing and hardware realisation labs to turn designs into working products.' },
  { icon: 'fa-server', title: 'Advanced computing', text: 'Computing facilities and IoT cloud platforms for building and testing at scale.' },
  { icon: 'fa-users', title: 'Mentorship', text: 'One-on-one guidance from domain experts, faculty and a global mentor panel.' },
  { icon: 'fa-line-chart', title: 'Go-to-market', text: 'Commercialisation and go-to-market advisory to reach customers sooner.' },
];

const WORKBENCH = [
  'Market opportunity and customer need analysis',
  'One-on-one mentor and domain consultation',
  '3D printing and rapid hardware prototyping',
  'Technical architecture and feasibility verification',
  'IoT cloud services integration and automated testing',
  'Intellectual property (IP) and commercialisation support',
];

const MISSION = [
  'Provide cutting-edge technical support and research guidance to young minds.',
  'Serve as a gateway connecting regional startups to global business hubs.',
  'Empower entrepreneurs to solve real societal challenges through technology.',
];

const SummaryPage = () => (
  <PageLayout
    title="Who we are"
    hero={{
      eyebrow: 'About AIC-IIITKottayam',
      title: 'An incubation centre built for societal impact',
      description:
        'AIC IIITKottayam Foundation is a non-profit Section 8 company sanctioned under the Atal Innovation Mission (AIM) of the Government of India.',
      breadcrumbs: [{ label: 'About' }, { label: 'Who we are' }],
    }}
  >
    <section className="section section--white">
      <div className="container split">
        <div className="split__copy">
          <p className="eyebrow">Our story</p>
          <h2 className="section-title">Solving real problems for entrepreneurs</h2>
          <p className="section-lead">
            The centre addresses the real-world problems of entrepreneurs with extensive support in knowledge, guidance,
            mentorship, hands-on training and state-of-the-art incubation infrastructure.
          </p>
          <p className="split__text">
            Incubatees at AIC-IIITKottayam can rapidly prototype and test their products using 3D printing, advanced
            computing facilities, hardware realisation labs and IoT cloud platforms, backed by commercialisation and
            go-to-market advisory.
          </p>
          <div className="btn-row">
            <a className="btn btn--primary" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
              Apply for incubation
            </a>
            <Link className="btn btn--outline" to="/aicteam">
              Meet the team
            </Link>
          </div>
        </div>
        <div className="split__media media-frame">
          <img src="/img/about2.jpg" alt="Founders working at AIC-IIITKottayam" loading="lazy" />
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <SectionHeader eyebrow="What incubatees get" title="Everything you need to build" align="center" />
        <div className="grid grid--4">
          {PILLARS.map((p, i) => (
            <article key={p.title} className="card">
              <span className={`icon-badge ${i % 2 ? 'icon-badge--accent' : ''}`}>
                <i className={`fa ${p.icon}`} aria-hidden="true" />
              </span>
              <h3 className="card__title feature-card__title">{p.title}</h3>
              <p className="card__text">{p.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="section section--white">
      <div className="container grid grid--2">
        <InfoCard icon="fa-compass" title="Vision & mission">
          <p className="info-card__text">
            <strong>Vision:</strong> To develop an international business hub for entrepreneurs by providing strong
            technical innovations that improve society and communities at large.
          </p>
          <p className="info-card__subhead">Mission</p>
          <ul className="check-list">
            {MISSION.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard icon="fa-university" title="Our host institute">
          <p className="info-card__text">
            AIC-IIITKottayam is hosted by the <strong>Indian Institute of Information Technology Kottayam</strong>, an
            Institute of National Importance. With visionary academic and research leadership, IIIT Kottayam fosters
            multidisciplinary technological innovation and entrepreneurial excellence.
          </p>
          <div className="card__footer">
            <a className="text-link" href={HOST_INSTITUTE_URL} target="_blank" rel="noopener noreferrer">
              Visit iiitkottayam.ac.in <i className="fa fa-external-link" aria-hidden="true" />
            </a>
          </div>
        </InfoCard>

        <InfoCard icon="fa-flask" title="Research objectives">
          <p className="info-card__text">
            Our core focus is developing high-impact societal applications using IoT, cloud architectures, AI/ML and
            cyber-physical systems.
          </p>
          <div className="media-frame info-card__media">
            <img src="/img/blog-post.jpg" alt="Research objectives of AIC-IIITKottayam" loading="lazy" />
          </div>
        </InfoCard>

        <InfoCard icon="fa-cogs" title="The AIC workbench" items={WORKBENCH} accent>
          <p className="info-card__text">End-to-end support for every incubatee:</p>
        </InfoCard>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <CtaBanner
          title="Ready to build with us?"
          text="Apply to the incubation programme and get access to mentors, labs and funding networks."
          action={{ label: 'Apply for incubation', href: APPLY_URL, icon: 'fa-arrow-right' }}
        />
      </div>
    </section>
  </PageLayout>
);

export default SummaryPage;
