import React from 'react';
import SectionHeader from '../common/SectionHeader';
import { cmsKey, useList } from '../../content/useText';
import { Text } from '../../content/Text';

// Each tile's texts are home.service.<i>.tag / .title / .text / .chips.
const SERVICES = [
  { variant: 'feature', photo: '/img/site/mentoring.jpg' },
  {},
  {},
  { variant: 'dark' },
  { variant: 'tint' },
  { variant: 'wide', photo: '/img/site/jury.jpg' },
];

const HomeService = () => {
  const list = useList();
  return (
    <section id="service" className="section section--white" aria-labelledby="service-title">
      <div className="container">
        <SectionHeader id="service-title" prefix="home.service" />

        {/* Bento layout: one large photo tile, four squares and a wide strip (see .bento in home.css) */}
        <ul className="bento">
          {SERVICES.map((s, i) => {
            const k = (field) => `home.service.${i}.${field}`;
            return (
              <li key={i} className={`bento__item ${s.variant ? `bento__item--${s.variant}` : ''}`}>
                {s.photo && <img className="bento__photo" src={s.photo} alt="" width="1600" height="1067" loading="lazy" />}
                <div className="bento__body">
                  <p className="bento__tag">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <Text k={k('tag')} />
                  </p>
                  <h3 className="bento__title">
                    <Text k={k('title')} />
                  </h3>
                  <p className="bento__text">
                    <Text k={k('text')} />
                  </p>
                  <p className="bento__chips" {...cmsKey(k('chips'))}>
                    {list(k('chips')).join(' · ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default HomeService;
