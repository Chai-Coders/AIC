import React, { useState, useEffect } from 'react';

const testimonials = [
  {
    image: '/img/perso1.jpg',
    name: 'Albert Einstein',
    role: 'Quotes',
    quote: ['In the middle of difficulty lies opportunity']
  },
  {
    image: '/img/perso2.jpg',
    name: 'A.P.J.Abdul Kalam',
    role: 'Quotes',
    quote: [
      'Dream, Dream, Dream. Dream transforms into thoughts, and thoughts result in action',
      'We should not give up and we should not allow the problem to defeat us.'
    ]
  }
];

const HomeTestimonial = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[index];

  return (
    <div id="testimonial" className="section md-padding">
      <div className="bg-img" style={{ backgroundImage: "url('/img/background3.jpg')" }}>
        <div className="overlay"></div>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-md-10 col-md-offset-1 text-center">
            <div className="testimonial" style={{ minHeight: '220px' }}>
              <div className="testimonial-meta">
                <img src={current.image} alt={current.name} style={{ borderRadius: '50%', width: '80px', height: '80px', objectFit: 'cover' }} />
                <h3 className="white-text">{current.name}</h3>
                <span>{current.role}</span>
              </div>
              {current.quote.map((q, qidx) => (
                <p key={qidx} className="white-text"><q> {q} </q></p>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              {testimonials.map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => setIndex(idx)}
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    margin: '0 5px',
                    borderRadius: '50%',
                    backgroundColor: index === idx ? '#00b4d8' : '#fff',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTestimonial;
