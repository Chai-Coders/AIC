import React from 'react';
import './HomePricing.css';

const REGISTER_URL = 'https://goo.gl/forms/bYQ16uftJgLtssgr2';

const plans = [
  {
    title: 'Support Contracts',
    tone: 'white',
    icon: 'fa-handshake-o',
    amount: '5K',
    per: '/ month',
    features: ['Incubate space', 'Knowledge assistance', '6 to 12 months']
  },
  {
    title: 'Training Contract',
    tone: 'yellow',
    icon: 'fa-graduation-cap',
    amount: '1K',
    per: '/ week',
    features: ['Incubate space', 'Training support', '1 to 4 weeks']
  },
  {
    title: 'Consultancy Contracts',
    tone: 'blue',
    icon: 'fa-line-chart',
    amount: '10K',
    per: '/ day',
    features: ['Onsite support', 'Consultancy support', 'Network support']
  }
];

const HomePricing = () => {
  return (
    <div id="pricing" className="section md-padding pricing-section">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="title">Business Model</h2>
        </div>

        <div className="plan-grid">
          {plans.map((plan) => (
            <article key={plan.title} className={`plan-card plan-card--${plan.tone}`}>
              <div className="plan-card-body">
                <span className="plan-card-icon">
                  <i className={`fa ${plan.icon}`} aria-hidden="true"></i>
                </span>
                <h3 className="plan-card-title">{plan.title}</h3>

                <div className="plan-card-price">
                  <strong className="plan-card-amount">{plan.amount}</strong>
                  <span className="plan-card-per">{plan.per}</span>
                </div>

                <p className="plan-card-features">
                  {plan.features.map((feat) => (
                    <span key={feat} className="plan-card-feature-line">
                      {feat}
                    </span>
                  ))}
                </p>
              </div>

              <div className="plan-card-tab">
                <a
                  href={REGISTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="plan-card-cta"
                >
                  Register Now <span className="plan-card-cta-arrow" aria-hidden="true">&gt;</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePricing;
