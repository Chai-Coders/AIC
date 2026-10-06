import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';

const CARDS = [
  {
    icon: 'fa-file-text-o',
    title: 'Who we are',
    text: 'AIC-IIITKottayam is the incubation centre of the Indian Institute of Information Technology Kottayam under the AIM scheme of India.',
    to: '/summary',
    cta: 'Read our story',
  },
  {
    icon: 'fa-users',
    title: 'Our people',
    text: 'The centre is governed by leading industrialists and academicians, and run by a dedicated team with a global mentor panel.',
    to: '/aicteam',
    cta: 'Meet the team',
    accent: true,
  },
  {
    icon: 'fa-leaf',
    title: 'Sustainability',
    text: 'We aim for sustainability while creating an ecosystem of entrepreneurs in the IoT cloud domain and beyond.',
    to: '/summary',
    cta: 'Our mission',
  },
];

const HomeAbout = () => (
  <section id="about" className="section section--white" aria-labelledby="about-title">
    <div className="container">
      <SectionHeader
        id="about-title"
        eyebrow="Innovate · Incubate · Impact"
        title={
          <>
            <span className="accent">AIC-IIITKottayam</span> Incubation Centre
          </>
        }
        lead="Nurturing ideas. Empowering innovators. Building a better tomorrow."
        align="center"
      />

      <div className="grid grid--3">
        {CARDS.map((card) => (
          <article key={card.title} className="card card--hover feature-card">
            <span className={`icon-badge ${card.accent ? 'icon-badge--accent' : ''}`}>
              <i className={`fa ${card.icon}`} aria-hidden="true" />
            </span>
            <h3 className="card__title feature-card__title">{card.title}</h3>
            <p className="card__text">{card.text}</p>
            <div className="card__footer">
              <Link to={card.to} className="text-link stretched-link">
                {card.cta} <i className="fa fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomeAbout;
