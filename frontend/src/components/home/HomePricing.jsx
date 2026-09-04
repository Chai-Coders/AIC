import React from 'react';
import SpotlightCard from '../common/SpotlightCard';

const plans = [
  {
    title: 'support contracts',
    price: '5K',
    duration: '/ month',
    features: ['Incubate space', 'Knowledge assistance', '6 to 12 months']
  },
  {
    title: 'Training contract',
    price: '1K',
    duration: '/ week',
    features: ['Incubate space', 'Training support', '1 to 4 weeks']
  },
  {
    title: 'Consultancy Contracts',
    price: '10K',
    duration: '/ day',
    features: ['Onsite support', 'Consultancy support', 'Network support']
  }
];

const HomePricing = () => {
  return (
    <div id="pricing" className="section md-padding">
      <div className="container">
        <div className="row flex-grid">
          <div className="section-header text-center col-xs-12">
            <h2 className="title">Business Model</h2>
          </div>

          {plans.map((plan, idx) => (
            <div key={idx} className="col-sm-4 flex-col">
              <SpotlightCard className="pricing" spotlightColor="rgba(224, 201, 34, 0.7)">
                <div className="price-head">
                  <span className="price-title">{plan.title}</span>
                  <div className="price">
                    <h3>{plan.price}<span className="duration">{plan.duration}</span></h3>
                  </div>
                </div>
                <ul className="price-content">
                  {plan.features.map((feat, fidx) => (
                    <li key={fidx}><p>{feat}</p></li>
                  ))}
                </ul>
                <div className="price-btn">
                  <a href="https://goo.gl/forms/bYQ16uftJgLtssgr2" target="_blank" rel="noopener noreferrer">
                    <button className="outline-btn">Register at incubate@iiitkottayam.ac.in</button>
                  </a>
                </div>
              </SpotlightCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePricing;
