import React from 'react';
import SectionHeader from '../common/SectionHeader';
import { RECOGNITION_FORM_URL } from '../../data/site';

const STEPS = [
  {
    icon: 'fa-users',
    title: 'Strong partnership network',
    desc: 'We keep our partners, including mentors, very close to our customers.',
    apply: true,
  },
  {
    icon: 'fa-map-marker',
    title: 'Reaching the centre directly',
    desc: 'Partner strengths flow into the centre. IISER-TVM, for instance, acts as a knowledge park, and we connect its experts directly with our customers.',
  },
  {
    icon: 'fa-sitemap',
    title: 'Expanding the network',
    desc: 'We expand our network of contacts with the support of our partners to attract more customers in the long run.',
  },
  {
    icon: 'fa-lightbulb-o',
    title: 'Encouraging innovation & R&D',
    desc: 'We inspire partners and customers to submit innovative R&D projects so that the expertise of AIC-IIITKottayam keeps growing.',
  },
  {
    icon: 'fa-shield',
    title: 'Continuous verification',
    desc: 'We periodically check in with existing customers so they remain satisfied and become advocates for the centre.',
    apply: true,
  },
];

const PHOTOS = [
  { img: '/img/background2.jpg', alt: 'IIIT Kottayam campus building', title: 'IIIT Kottayam campus', tagline: 'Innovation · Research · Impact' },
  { img: '/img/about1.jpg', alt: 'IoT Cloud Societal Project banner', title: 'IoT Cloud Societal Project', tagline: 'Ideate · Develop · Deploy' },
  { img: '/img/gal/img7.jpg', alt: 'Mentors guiding founders at the incubation centre', title: 'Mentorship & guidance', tagline: 'Learn · Build · Grow' },
  { img: '/img/about3.jpg', alt: 'R&D session at the incubation centre', title: 'R&D and innovation', tagline: 'Research · Development · Solutions' },
];

const HomeFeatures = () => (
  <section id="features" className="section section--white" aria-labelledby="features-title">
    <div className="container">
      <SectionHeader
        id="features-title"
        eyebrow="How we work"
        title={
          <>
            The success formula of <span className="accent">AIC-IIITKottayam</span>
          </>
        }
        lead="Five ingredients that shape how we support every startup in our programmes."
        align="center"
      />

      <ol className="steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="steps__item">
            <div className="steps__marker">
              <span className="steps__num">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="steps__body">
              <i className={`fa ${step.icon} steps__icon`} aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {step.apply && (
                <a className="text-link steps__apply" href={RECOGNITION_FORM_URL} target="_blank" rel="noopener noreferrer">
                  Apply for recognition <i className="fa fa-arrow-right" aria-hidden="true" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="photo-strip">
        {PHOTOS.map((p) => (
          <figure key={p.title} className="photo-card">
            <img src={p.img} alt={p.alt} loading="lazy" decoding="async" />
            <figcaption>
              <strong>{p.title}</strong>
              <span>{p.tagline}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

export default HomeFeatures;
