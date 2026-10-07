import React from 'react';
import { RECOGNITION_FORM_URL } from '../../data/site';

const STEPS = [
  {
    title: 'A strong partnership network',
    desc: 'We keep our partners, including mentors, close to the startups and customers we serve.',
  },
  {
    title: 'Partners reach the centre directly',
    desc: 'Partner strengths flow into the centre. IISER-TVM, for instance, acts as a knowledge park, and we connect its experts directly with our startups.',
  },
  {
    title: 'An expanding network',
    desc: 'With the support of our partners we keep widening our network of contacts, so founders meet more customers over time.',
  },
  {
    title: 'Innovation & R&D, encouraged',
    desc: 'We invite partners and startups to bring innovative R&D projects, so the expertise of AIC-IIITKottayam keeps growing.',
  },
  {
    title: 'Continuous follow-through',
    desc: 'We check in with the teams we support at regular intervals, so they stay on track and become advocates for the centre.',
  },
];

// Each photo has its own shape in the mosaic (see .mosaic in home.css).
const PHOTOS = [
  { img: '/img/site/mentoring.jpg', alt: 'Mentors in conversation with founders at the incubation centre', caption: 'Mentorship', shape: 'arch' },
  { img: '/img/site/visit.jpg', alt: 'Visiting dignitaries meeting student innovators', caption: 'Industry & government', shape: 'wide' },
  { img: '/img/site/demo.jpg', alt: 'Student founders demonstrating their product to visitors', caption: 'Demo days', shape: 'circle' },
  { img: '/img/site/session.jpg', alt: 'A training session in the AIC lab', caption: 'Training', shape: 'rect' },
  { img: '/img/site/cohort.jpg', alt: 'A cohort of student innovators at an AIC programme', caption: 'Cohorts', shape: 'pill' },
];

const HomeFeatures = () => (
  <section id="features" className="section" aria-labelledby="features-title">
    <div className="container">
      <div className="approach">
        <header className="approach__head">
          <p className="eyebrow">How we work</p>
          <h2 id="features-title" className="section-title">
            The AIC-IIITKottayam success formula
          </h2>
          <p className="section-lead">Five principles that shape how we support every startup in our programmes.</p>
          <a className="btn btn--outline approach__cta" href={RECOGNITION_FORM_URL} target="_blank" rel="noopener noreferrer">
            Apply for recognition <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
        </header>

        <ol className="approach__list">
          {STEPS.map((step, i) => (
            <li key={step.title} className="approach__item">
              <span className="approach__num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mosaic">
        {PHOTOS.map((p) => (
          <figure key={p.img} className={`mosaic__item mosaic__item--${p.shape}`}>
            <div className="mosaic__frame">
              <img src={p.img} alt={p.alt} loading="lazy" decoding="async" width="2000" height="1333" />
            </div>
            <figcaption>{p.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFeatures;
