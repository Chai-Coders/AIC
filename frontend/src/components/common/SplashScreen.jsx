import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

// First-visit splash: the AIC logo fills with liquid while the page loads.

const MIN_VISIBLE_MS = 2400;
const MAX_VISIBLE_MS = 6000;
const EXIT_MS = 700;
const SESSION_KEY = 'aic:splash-seen';
const BUBBLES = [
  { x: 14, size: 7, dur: 3.4, delay: 0.2 },
  { x: 29, size: 4, dur: 2.6, delay: 1.1 },
  { x: 47, size: 9, dur: 4.1, delay: 0.6 },
  { x: 63, size: 5, dur: 3.0, delay: 1.6 },
  { x: 78, size: 7, dur: 3.7, delay: 0.9 },
  { x: 91, size: 4, dur: 2.9, delay: 1.9 },
];

// sessionStorage throws when site data is blocked (private mode, strict settings).
const seenThisSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Showing the splash again next page load is harmless.
  }
};

const SplashScreen = () => {
  // Decided once: only the very first landing on the home page gets the splash,
  // and never when the visitor asked for reduced motion.
  const [show] = useState(() =>
    window.location.pathname === '/'
    && !seenThisSession()
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [leaving, setLeaving] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    markSeen();
    document.body.classList.add('is-splash-open');

    const shownAt = performance.now();
    let dismissed = false;
    let holdId;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      // Let the fill animation read as deliberate even on an instant load.
      holdId = window.setTimeout(
        () => setLeaving(true),
        Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt))
      );
    };

    const capId = window.setTimeout(dismiss, MAX_VISIBLE_MS);
    if (document.readyState === 'complete') {
      dismiss();
    } else {
      window.addEventListener('load', dismiss, { once: true });
    }

    return () => {
      window.clearTimeout(capId);
      window.clearTimeout(holdId);
      window.removeEventListener('load', dismiss);
      document.body.classList.remove('is-splash-open');
    };
  }, [show]);

  useEffect(() => {
    if (!leaving) {
      return undefined;
    }
    document.body.classList.remove('is-splash-open');
    const id = window.setTimeout(() => setRemoved(true), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  if (!show || removed) {
    return null;
  }

  return (
    <div
      className={`splash ${leaving ? 'splash--leaving' : ''}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading AIC-IIIT Kottayam"
    >
      <div className="splash__stage">
        <div className="splash__logo" aria-hidden="true">
          <img className="splash__ghost" src="/img/aic-logo.png" alt="" />
          <div className="splash__fluid">
            <div className="splash__liquid">
              <span className="splash__wave" />
              <span className="splash__wave splash__wave--back" />
              {BUBBLES.map((bubble) => (
                <span
                  key={bubble.x}
                  className="splash__bubble"
                  style={{
                    '--bubble-x': `${bubble.x}%`,
                    '--bubble-size': `${bubble.size}px`,
                    '--bubble-duration': `${bubble.dur}s`,
                    '--bubble-delay': `${bubble.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <img className="splash__real" src="/img/aic-logo.png" alt="" />
          <span className="splash__shine" />
        </div>
        <p className="splash__caption">Atal Incubation Centre &middot; IIIT Kottayam</p>
        <div className="splash__bar" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
};

export default SplashScreen;
