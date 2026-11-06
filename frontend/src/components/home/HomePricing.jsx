import React from 'react';
import SectionHeader from '../common/SectionHeader';
import { REGISTER_URL } from '../../data/site';
import { cmsKey, useList, useText } from '../../content/useText';
import { Text } from '../../content/Text';

// Each plan's texts are home.pricing.<i>.title / .amount / .per / .features.
const PLANS = [{}, { featured: true }, {}];

const HomePricing = () => {
  const t = useText();
  const list = useList();
  return (
    <section id="pricing" className="section section--alt" aria-labelledby="pricing-title">
      <div className="container">
        <SectionHeader id="pricing-title" prefix="home.pricing" align="center" />

        <div className="plans">
          {PLANS.map((plan, i) => {
            const k = (field) => `home.pricing.${i}.${field}`;
            return (
              <article key={i} className={`plan ${plan.featured ? 'plan--featured' : ''}`}>
                <h3 className="plan__title">
                  <Text k={k('title')} />
                </h3>
                <p className="plan__price">
                  <strong>
                    <Text k={k('amount')} />
                  </strong>
                  <span>
                    <Text k={k('per')} />
                  </span>
                </p>
                <ul className="plan__features" {...cmsKey(k('features'))}>
                  {list(k('features')).map((feat, j) => (
                    <li key={j}>{feat}</li>
                  ))}
                </ul>
                <a
                  href={REGISTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn--block ${plan.featured ? 'btn--accent' : 'btn--outline'}`}
                >
                  <Text k="home.pricing.button" />
                  <span className="sr-only"> for the {t(k('title')).toLowerCase()}</span>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomePricing;
