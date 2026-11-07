import React from 'react';
import { Text } from '../../content/Text';
import { useText } from '../../content/useText';

// Titles and texts are home.features.steps.<i>.title / .text.
const STEP_COUNT = 5;

// Each photo has its own shape in the mosaic (see .mosaic in home.css).
// Captions are home.features.photos.<i>.
const PHOTOS = [
  { img: '/img/site/mentoring.jpg', alt: 'Mentors in conversation with founders at the incubation centre', shape: 'arch' },
  { img: '/img/site/visit.jpg', alt: 'Visiting dignitaries meeting student innovators', shape: 'wide' },
  { img: '/img/site/demo.jpg', alt: 'Student founders demonstrating their product to visitors', shape: 'circle' },
  { img: '/img/site/session.jpg', alt: 'A training session in the AIC lab', shape: 'rect' },
  { img: '/img/site/cohort.jpg', alt: 'A cohort of student innovators at an AIC programme', shape: 'pill' },
];

const HomeFeatures = () => {
  const t = useText();
  return (
  <section id="features" className="section" aria-labelledby="features-title">
    <div className="container">
      <div className="approach">
        <header className="approach__head">
          <p className="eyebrow">
            <Text k="home.features.eyebrow" />
          </p>
          <h2 id="features-title" className="section-title">
            <Text k="home.features.title" />
          </h2>
          <p className="section-lead">
            <Text k="home.features.lead" />
          </p>
          <a className="btn btn--outline approach__cta" href={t('links.recognition')} target="_blank" rel="noopener noreferrer">
            <Text k="home.features.button" /> <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
        </header>

        <ol className="approach__list">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <li key={i} className="approach__item">
              <span className="approach__num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>
                  <Text k={`home.features.steps.${i}.title`} />
                </h3>
                <p>
                  <Text k={`home.features.steps.${i}.text`} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mosaic">
        {PHOTOS.map((p, i) => (
          <figure key={p.img} className={`mosaic__item mosaic__item--${p.shape}`}>
            <div className="mosaic__frame">
              <img src={p.img} alt={p.alt} loading="lazy" decoding="async" width="2000" height="1333" />
            </div>
            <figcaption>
              <Text k={`home.features.photos.${i}`} />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);
};

export default HomeFeatures;
