import React from 'react';
import { Link } from 'react-router-dom';
import { Text } from '../../content/Text';

// Titles and texts are home.about.links.<i>.title / .text.
const LINKS = ['/summary', '/aicteam', '/summary'];

const HomeAbout = () => (
  <section id="about" className="section section--white" aria-labelledby="about-title">
    <div className="container">
      <div className="about">
        <div className="about__intro">
          <p className="eyebrow">
            <Text k="home.about.eyebrow" />
          </p>
          <h2 id="about-title" className="section-title">
            <Text k="home.about.title" />
          </h2>
          <p className="section-lead">
            <Text k="home.about.lead" />
          </p>
          <div className="about__backers">
            <p>
              <Text k="home.about.backers" />
            </p>
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
        {LINKS.map((to, i) => (
          <li key={i}>
            <Link to={to} className="about__link">
              <span className="about__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="about__title">
                <Text k={`home.about.links.${i}.title`} />
              </span>
              <span className="about__text">
                <Text k={`home.about.links.${i}.text`} />
              </span>
              <span className="about__more">
                <Text k="home.about.more" /> <i className="fa fa-arrow-right" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HomeAbout;
