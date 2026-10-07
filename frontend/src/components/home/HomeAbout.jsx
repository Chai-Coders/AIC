import React from 'react';
import { Link } from 'react-router-dom';

const LINKS = [
  {
    title: 'Who we are',
    text: 'The incubation centre of the Indian Institute of Information Technology Kottayam, under the Atal Innovation Mission of the Government of India.',
    to: '/summary',
  },
  {
    title: 'Our people',
    text: 'Governed by leading industrialists and academicians, run by a dedicated team, and backed by a global mentor panel.',
    to: '/aicteam',
  },
  {
    title: 'Sustainability',
    text: 'We are building a lasting ecosystem of entrepreneurs in the IoT cloud domain and beyond.',
    to: '/summary',
  },
];

const HomeAbout = () => (
  <section id="about" className="section section--white" aria-labelledby="about-title">
    <div className="container">
      <div className="about">
        <div className="about__intro">
          <p className="eyebrow">About the centre</p>
          <h2 id="about-title" className="section-title">
            An incubator with the depth of a <em>national institute.</em>
          </h2>
          <p className="section-lead">
            AIC-IIITKottayam gives founders what is hardest to find early on: serious technical depth, honest
            mentorship and the credibility of an institution behind them.
          </p>
          <div className="about__backers">
            <p>Supported by</p>
            <img src="/img/site/aim-niti.png" alt="Atal Innovation Mission, NITI Aayog" width="600" height="242" loading="lazy" />
            <img src="/img/site/iiitk.jpg" alt="Indian Institute of Information Technology Kottayam" width="600" height="338" loading="lazy" />
          </div>
        </div>

        <div className="about__media" aria-hidden="true">
          <img className="about__arch" src="/img/site/pitching.jpg" alt="" width="1600" height="1067" loading="lazy" />
          <img className="about__circle" src="/img/site/presenting.jpg" alt="" width="1600" height="1067" loading="lazy" />
          <span className="about__ring" />
        </div>
      </div>

      <ol className="about__list">
        {LINKS.map((item, i) => (
          <li key={item.title}>
            <Link to={item.to} className="about__link">
              <span className="about__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="about__title">{item.title}</span>
              <span className="about__text">{item.text}</span>
              <span className="about__more">
                Read more <i className="fa fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HomeAbout;
