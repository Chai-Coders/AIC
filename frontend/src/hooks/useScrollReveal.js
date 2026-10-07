import { useEffect } from 'react';

// Blocks that fade up as they scroll into view. Kept in one place so pages
// don't need extra markup; content that arrives later from the API is picked
// up by the MutationObserver below.
const SELECTOR = [
  '.section-head',
  '.page-hero__inner',
  '.about__intro',
  '.about__media',
  '.about__link',
  '.program',
  '.bento__item',
  '.logo-marquee',
  '.approach__head',
  '.approach__item',
  '.mosaic__item',
  '.plan',
  '.news-card',
  '.gallery-grid > li',
  '.contact__info',
  '.contact__form',
  '.info-card',
  '.lead-panel',
  '.callout',
  '.cta-banner',
  '.pillar',
  '.split__copy',
  '.split__media',
  '.startup-card',
  '.partner-tile',
  '.member-carousel',
  '.site-footer__cta',
].join(',');

/**
 * Adds a staggered fade-up to content blocks as they enter the viewport.
 * Does nothing for visitors who prefer reduced motion, or in browsers without
 * IntersectionObserver, so content is never left hidden.
 */
function useScrollReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const root = document.documentElement;
    root.classList.add('has-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        // Blocks that come into view together are staggered left to right.
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, i) => {
            entry.target.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 90}ms`);
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    );

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (el.hasAttribute('data-reveal')) return;
        el.setAttribute('data-reveal', '');
        observer.observe(el);
      });
    };

    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });

    scan();
    mutations.observe(document.getElementById('root'), { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      root.classList.remove('has-reveal');
      // Untag what this observer never revealed, so a later run picks it up again.
      document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => el.removeAttribute('data-reveal'));
    };
  }, []);
}

export default useScrollReveal;
