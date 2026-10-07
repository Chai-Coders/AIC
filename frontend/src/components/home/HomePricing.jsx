import React from 'react';
import SectionHeader from '../common/SectionHeader';
import { REGISTER_URL } from '../../data/site';

const PLANS = [
  {
    title: 'Support contract',
    amount: '₹5K',
    per: 'per month',
    features: ['Incubation space', 'Knowledge assistance', '6 to 12 months'],
  },
  {
    title: 'Training contract',
    amount: '₹1K',
    per: 'per week',
    features: ['Incubation space', 'Training support', '1 to 4 weeks'],
    featured: true,
  },
  {
    title: 'Consultancy contract',
    amount: '₹10K',
    per: 'per day',
    features: ['Onsite support', 'Consultancy support', 'Network support'],
  },
];

const HomePricing = () => (
  <section id="pricing" className="section section--alt" aria-labelledby="pricing-title">
    <div className="container">
      <SectionHeader
        id="pricing-title"
        eyebrow="Business model"
        title="Simple terms, no surprises"
        lead="Three ways to work with the centre, depending on how much space, training or hands-on support you need."
        align="center"
      />

      <div className="plans">
        {PLANS.map((plan) => (
          <article key={plan.title} className={`plan ${plan.featured ? 'plan--featured' : ''}`}>
            <h3 className="plan__title">{plan.title}</h3>
            <p className="plan__price">
              <strong>{plan.amount}</strong>
              <span>{plan.per}</span>
            </p>
            <ul className="plan__features">
              {plan.features.map((feat) => (
                <li key={feat}>{feat}</li>
              ))}
            </ul>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn--block ${plan.featured ? 'btn--accent' : 'btn--outline'}`}
            >
              Register now<span className="sr-only"> for the {plan.title.toLowerCase()}</span>
            </a>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HomePricing;
