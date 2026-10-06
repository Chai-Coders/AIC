import React from 'react';
import SectionHeader from '../common/SectionHeader';
import { REGISTER_URL } from '../../data/site';

const PLANS = [
  {
    title: 'Support Contract',
    icon: 'fa-handshake-o',
    amount: '₹5K',
    per: '/ month',
    features: ['Incubation space', 'Knowledge assistance', '6 to 12 months'],
  },
  {
    title: 'Training Contract',
    icon: 'fa-graduation-cap',
    amount: '₹1K',
    per: '/ week',
    features: ['Incubation space', 'Training support', '1 to 4 weeks'],
    featured: true,
  },
  {
    title: 'Consultancy Contract',
    icon: 'fa-line-chart',
    amount: '₹10K',
    per: '/ day',
    features: ['On-site support', 'Consultancy support', 'Network support'],
  },
];

const HomePricing = () => (
  <section id="pricing" className="section" aria-labelledby="pricing-title">
    <div className="container">
      <SectionHeader
        id="pricing-title"
        eyebrow="Business model"
        title="Flexible engagement plans"
        lead="Choose the level of support that fits your stage, from short training stints to long-term incubation."
        align="center"
      />

      <div className="plans">
        {PLANS.map((plan) => (
          <article key={plan.title} className={`plan ${plan.featured ? 'plan--featured' : ''}`}>
            <span className={`icon-badge ${plan.featured ? 'icon-badge--dark' : ''}`}>
              <i className={`fa ${plan.icon}`} aria-hidden="true" />
            </span>
            <h3 className="plan__title">{plan.title}</h3>
            <p className="plan__price">
              <strong>{plan.amount}</strong>
              <span>{plan.per}</span>
            </p>
            <ul className="check-list plan__features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn--block ${plan.featured ? 'btn--accent' : 'btn--outline'}`}
            >
              Register now <i className="fa fa-arrow-right" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomePricing;
