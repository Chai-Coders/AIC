import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import { Text } from '../../content/Text';

// Each programme's texts are home.programs.<i>.stage / .title / .text / .factLabel / .fact / .link.
const PROGRAMS = [{ to: '/sia' }, { to: '/sisfs', featured: true }, { to: '/startup' }];

const HomePrograms = () => (
  <section id="programmes" className="section" aria-labelledby="programmes-title">
    <div className="container">
      <SectionHeader id="programmes-title" prefix="home.programs" />

      <ol className="programs">
        {PROGRAMS.map((p, i) => {
          const k = (field) => `home.programs.${i}.${field}`;
          return (
            <li key={p.to} className={`program ${p.featured ? 'program--featured' : ''}`}>
              <p className="program__stage">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <Text k={k('stage')} />
              </p>
              <h3 className="program__title">
                <Text k={k('title')} />
              </h3>
              <p className="program__text">
                <Text k={k('text')} />
              </p>
              <dl className="program__fact">
                <dt>
                  <Text k={k('factLabel')} />
                </dt>
                <dd>
                  <Text k={k('fact')} />
                </dd>
              </dl>
              <Link to={p.to} className="text-link stretched-link">
                <Text k={k('link')} /> <i className="fa fa-arrow-right" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  </section>
);

export default HomePrograms;
