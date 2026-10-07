import React from 'react';
import PageLayout from '../components/common/PageLayout';
import { Callout, CtaBanner, InfoCard } from '../components/sections/ProgramContent';
import { formatDate } from '../lib/format';

const CAREERS_EMAILS = ['shajulin@iiitkottayam.ac.in', 'incubate@iiitkottayam.ac.in'];

const POSITIONS = [
  {
    title: 'Chief Executive Officer (CEO)',
    type: 'Full time',
    summary: 'Lead the incubation centre, its programmes and its startup portfolio.',
    pdf: '/pdfs/CEO-Position.pdf',
    deadline: '2025-12-25',
  },
  {
    title: 'Non-stipendiary internship',
    type: 'Internship · 2-3+ months',
    summary: 'Open to MCA, MSc (Comp/IT), BE/BTech students and recent graduates.',
  },
];

const INTERNSHIP_CARDS = [
  {
    icon: 'fa-bullseye',
    title: 'Objectives',
    items: [
      'Work on the day-to-day activities of the Atal Incubation Centre alongside real product development',
      'Hands-on development in Java, web / JavaScript frameworks, Python, machine learning, Android, IoT and blockchain',
    ],
  },
  {
    icon: 'fa-graduation-cap',
    title: 'Qualification & eligibility',
    items: [
      'Students doing final-semester projects: MCA / MSc (Comp/IT) / BE / BTech (CSE, IT, EEE, EC)',
      'Recent graduates passionate about innovation, technology and startup ecosystems',
    ],
  },
  {
    icon: 'fa-tasks',
    title: 'Responsibilities & skills',
    items: [
      'Active product development across front-end, back-end, IoT and AI projects',
      'Good communication, fast learning, mentoring and technical documentation',
    ],
  },
  {
    icon: 'fa-star',
    title: 'Perks & benefits',
    accent: true,
    items: [
      'Official internship experience certificate from AIC-IIITKottayam',
      'Flexible working hours with hands-on exposure to live startup projects',
      'Networking with tech mentors and industry leaders',
    ],
  },
];

const isPast = (date) => date && new Date(`${date}T23:59:59`) < new Date();

const PositionCard = ({ position }) => {
  const closed = isPast(position.deadline);
  return (
    <article className="card position-card">
      <div className="position-card__head">
        <span className="chip">{position.type}</span>
        {position.deadline && (
          <span className={`chip ${closed ? '' : 'chip--accent'}`}>
            {closed ? 'Closed' : `Apply by ${formatDate(position.deadline)}`}
          </span>
        )}
      </div>
      <h3 className="card__title">{position.title}</h3>
      <p className="card__text">{position.summary}</p>
      {position.pdf && (
        <div className="card__footer">
          <a className="text-link" href={position.pdf} target="_blank" rel="noopener noreferrer">
            <i className="fa fa-file-pdf-o" aria-hidden="true" /> Position details (PDF)
          </a>
        </div>
      )}
    </article>
  );
};

const CareersPage = () => (
  <PageLayout
    title="Careers"
    hero={{
      eyebrow: 'Careers',
      title: 'Work with AIC-IIITKottayam',
      description:
        'Help run the incubation centre, or intern with us and build real products alongside our startups.',
      breadcrumbs: [{ label: 'Careers' }],
    }}
  >
    <section className="section">
      <div className="container stack">
        <h2 className="section-title section-title--sm">Open positions</h2>
        <div className="grid grid--2">
          {POSITIONS.map((p) => (
            <PositionCard key={p.title} position={p} />
          ))}
        </div>
      </div>
    </section>

    <section className="section section--white">
      <div className="container stack">
        <h2 className="section-title section-title--sm">Internship programme</h2>
        <Callout icon="fa-clock-o">
          Interns should be available for at least 2 to 3 months, full time (Monday to Friday).
        </Callout>
        <div className="info-grid">
          {INTERNSHIP_CARDS.map((card) => (
            <InfoCard key={card.title} {...card} />
          ))}
        </div>
        <CtaBanner
          title="Interested in joining or interning at AIC?"
          text={`Send your resume to ${CAREERS_EMAILS.join(' and ')}.`}
          action={
            <a
              className="btn btn--accent"
              href={`mailto:${CAREERS_EMAILS.join(',')}?subject=${encodeURIComponent('Application for career / internship at AIC-IIITK')}`}
            >
              Email your resume <i className="fa fa-envelope" aria-hidden="true" />
            </a>
          }
        />
      </div>
    </section>
  </PageLayout>
);

export default CareersPage;
