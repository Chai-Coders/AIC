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
        
        // Smooth ease-out cubic
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
      if (rect.top <= windowHeight * 0.95 && rect.bottom >= 0) {
        startAnimation();
      }
    };

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
        { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
      );
      observer.observe(el);
    }

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
    <span ref={ref} className="bento-counter-num">
      {count}
    </span>
  );
};

const HomeService = () => {
  const stats = [
    {
      icon: 'fa-users',
      count: 42,
      label: 'Number of Startup',
      type: 'gold'
    },
    {
      icon: 'fa-trophy',
      count: 141,
      label: 'Jobs Created',
      type: 'green'
    },
    {
      icon: 'fa-coffee',
      count: 12,
      label: 'Submissions',
      type: 'purple'
    },
    {
      icon: 'fa-file-text-o',
      count: 11,
      label: 'IP generated',
      type: 'cyan'
    }
  ];

  const wrapperRef = useRef(null);

  const handleWrapperMouseMove = (e) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    wrapperRef.current.style.setProperty('--mouse-x', `${x}px`);
    wrapperRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section id="service" className="bento-section">
      <div className="container">
        {/* Section Header */}
        <div className="bento-header">
          
          <h2 className="bento-header-title">
            AIC-IIITKottayam <span className="gradient-blue">Value Proposition</span> & <span className="gradient-yellow">Impact</span>
          </h2>
          <p className="bento-header-desc">
            Empowering early-stage founders with comprehensive mentorship, rapid IP commercialization, and verified ecosystem milestones.
          </p>
        </div>

        {/* Outline Container Wrapper with Interactive Background Glow */}
        <div 
          ref={wrapperRef}
          onMouseMove={handleWrapperMouseMove}
          className="bento-outline-wrapper"
        >
          {/* Master Bento Grid */}
          <div className="bento-grid">
            
            {/* Row 1 - Card 1: Training & Mentorship (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-yellow" spotlightColor="rgba(2, 132, 199, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-graduation-cap"></i>
                      </div>
                      <span className="bento-tag">Capability</span>
                    </div>
                    <h3 className="bento-card-title">Training & Mentorship</h3>
                    <p className="bento-card-desc">
                      Curated practical and theoretical frameworks to upskill technical teams for product excellence.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> 1-on-1 Mentors</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Tech Labs</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 1 - Card 2: Patent & IP Support (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-blue" spotlightColor="rgba(234, 179, 8, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-certificate"></i>
                      </div>
                      <span className="bento-tag">Protection</span>
                    </div>
                    <h3 className="bento-card-title">Patent & IP Support</h3>
                    <p className="bento-card-desc">
                      Fast-track intellectual property guidance and filing with expert legal advisors and faculty.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> IP Guidance</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Prior-Art Search</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 1 - Card 3: Idea Generation Hub (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-yellow" spotlightColor="rgba(2, 132, 199, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-lightbulb-o"></i>
                      </div>
                      <span className="bento-tag">Innovation</span>
                    </div>
                    <h3 className="bento-card-title">Idea Generation Hub</h3>
                    <p className="bento-card-desc">
                      Transforming nascent concepts into market-ready prototypes via hackathons and ideation sprints.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Hackathons</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Prototyping</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 2 - Card 4: Marketing & GTM (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-blue" spotlightColor="rgba(234, 179, 8, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-line-chart"></i>
                      </div>
                      <span className="bento-tag">Growth</span>
                    </div>
                    <h3 className="bento-card-title">Marketing & GTM</h3>
                    <p className="bento-card-desc">
                      Strategic sales, PR, and digital outreach to ensure wide user adoption and market penetration.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> GTM Strategy</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Product Launch</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 2 - Card 5: Institutional Prestige & Credibility (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-yellow" spotlightColor="rgba(2, 132, 199, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-university"></i>
                      </div>
                      <span className="bento-tag">Prestige</span>
                    </div>
                    <h3 className="bento-card-title">Institutional Prestige</h3>
                    <p className="bento-card-desc">
                      Leveraging the academic rigor and network trust of IIIT Kottayam to build founder credibility with investors.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> IIITK Heritage</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> NITI Aayog Recognized</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 2 - Card 6: Global Visibility & Investor Network (4 Cols) */}
            <div className="bento-col" style={{ gridColumn: 'span 4' }}>
              <SpotlightCard className="theme-blue" spotlightColor="rgba(234, 179, 8, 0.4)">
                <div className="bento-card-content">
                  <div>
                    <div className="bento-top-bar">
                      <div className="bento-icon-box">
                        <i className="fa fa-globe"></i>
                      </div>
                      <span className="bento-tag">Network</span>
                    </div>
                    <h3 className="bento-card-title">Global Visibility</h3>
                    <p className="bento-card-desc">
                      Direct invitations to venture capitalists, angel networks, and international trade bodies to elevate startup scale.
                    </p>
                  </div>
                  <div className="bento-chips-list">
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Investor Pitch Days</span>
                    <span className="bento-chip"><i className="fa fa-circle bento-chip-dot"></i> Global Demo Days</span>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Row 3 (Bottom Row) - Achievements Section (12 Cols Full Width) */}
            <div className="bento-col bento-col-achievements" style={{ gridColumn: 'span 12' }}>
              <SpotlightCard className="theme-achievements" spotlightColor="rgba(0, 134, 230, 0.4)">
                <div className="bento-stats-content">
                  <div className="bento-stats-hub-header">
                    <div className="bento-stats-hub-title-group">
                      <div className="bento-icon-box">
                        <i className="fa fa-line-chart"></i>
                      </div>
                      <h3 className="bento-stats-hub-title">Key Ecosystem Achievements</h3>
                    </div>
                    <span className="bento-tag">Impact</span>
                  </div>

                  <div className="bento-stats-matrix">
                    {stats.map((stat, idx) => (
                      <div key={idx} className={`bento-stat-box stat-${stat.type}`}>
                        <div className="bento-stat-icon-mini">
                          <i className={`fa ${stat.icon}`}></i>
                        </div>
                        <div className="bento-stat-number">
                          <AnimatedCounter target={stat.count} duration={2200} />
                        </div>
                        <span className="bento-stat-name">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SpotlightCard>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeService;




