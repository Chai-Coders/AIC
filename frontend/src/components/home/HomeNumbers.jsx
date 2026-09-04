import React, { useState, useEffect, useRef } from 'react';
import SpotlightCard from '../common/SpotlightCard';

const AnimatedCounter = ({ target, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const startAnimation = () => {
      if (hasStarted.current) return;
      hasStarted.current = true;

      const targetNum = parseInt(target, 10);
      if (isNaN(targetNum)) return;

      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Ease-out cubic for smooth slowdown as it reaches the target number
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * targetNum));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(targetNum);
        }
      };

      requestAnimationFrame(animate);
    };

    const checkVisibility = () => {
      if (hasStarted.current) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= windowHeight * 0.9 && rect.bottom >= 0) {
        startAnimation();
      }
    };

    // Primary detection: IntersectionObserver
    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      );
      observer.observe(el);
    }

    // Immediate check & scroll event fallback
    checkVisibility();
    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });

    return () => {
      if (observer && el) {
        observer.unobserve(el);
      }
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className="number-counter-val" style={{ display: 'inline-block', minWidth: '1.2em' }}>
      {count}
    </span>
  );
};

const stats = [
  { icon: 'fa-users', count: 42, title: 'Number of Startup' },
  { icon: 'fa-trophy', count: 141, title: 'Jobs Created' },
  { icon: 'fa-coffee', count: 12, title: 'Submissions' },
  { icon: 'fa-file', count: 11, title: 'IP generated' }
];

const HomeNumbers = () => {
  return (
    <div id="numbers" className="section sm-padding" style={{ backgroundColor: 'var(--bg-subtle, #f1f5f9)', padding: '60px 0' }}>
      <div className="container">
        <div className="row flex-grid">
          {stats.map((item, idx) => (
            <div key={idx} className="col-sm-3 col-xs-6 flex-col" style={{ marginBottom: '20px' }}>
              <SpotlightCard className="number-box" spotlightColor="rgba(224, 201, 34, 0.7)">
                <div className="number">
                  <i className={`fa ${item.icon}`}></i>
                  <h3 className="number-val">
                    <AnimatedCounter target={item.count} duration={2200} />
                  </h3>
                  <span className="number-title">{item.title}</span>
                </div>
              </SpotlightCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeNumbers;
