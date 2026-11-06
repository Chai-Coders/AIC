import React from 'react';
import { cmsKey, useHasText, useList } from '../../content/useText';
import { Text } from '../../content/Text';

/**
 * Icon + heading + bullet list card used on programme pages. With `prefix`,
 * the heading is the text `<prefix>.title` and the bullets `<prefix>.items`.
 */
export const InfoCard = ({ icon, prefix, ordered = false, accent = false, children }) => {
  const has = useHasText();
  const list = useList();
  const itemsKey = `${prefix}.items`;
  return (
    <article className={`card info-card ${accent ? 'info-card--accent' : ''}`}>
      <div className="info-card__head">
        {icon && <i className={`fa ${icon}`} aria-hidden="true" />}
        <h3>
          <Text k={`${prefix}.title`} />
        </h3>
      </div>
      {children}
      {has(itemsKey) && (
        <ul className={`check-list ${ordered ? 'check-list--numbered' : ''}`} {...cmsKey(itemsKey)}>
          {list(itemsKey).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </article>
  );
};

export const Callout = ({ icon = 'fa-info-circle', accent = false, children }) => (
  <div className={`callout ${accent ? 'callout--accent' : ''}`}>
    <i className={`fa ${icon}`} aria-hidden="true" />
    <p>{children}</p>
  </div>
);

/**
 * Dark call-to-action banner with the texts `<prefix>.title`, `<prefix>.text`
 * and `<prefix>.button`. `action` is { href, icon? } (external link) or a React node.
 */
export const CtaBanner = ({ prefix, action }) => {
  const has = useHasText();
  return (
    <aside className="cta-banner">
      <div>
        <h2>
          <Text k={`${prefix}.title`} />
        </h2>
        {has(`${prefix}.text`) && (
          <p>
            <Text k={`${prefix}.text`} />
          </p>
        )}
      </div>
      {action &&
        (React.isValidElement(action) ? (
          action
        ) : (
          <a className="btn btn--accent" href={action.href} target="_blank" rel="noopener noreferrer">
            <Text k={`${prefix}.button`} /> <i className={`fa ${action.icon || 'fa-external-link'}`} aria-hidden="true" />
          </a>
        ))}
    </aside>
  );
};

/**
 * Standard programme page body, from the texts under `prefix`: an intro
 * (`intro`), notes (`notes.<i>`), a grid of info cards (`cards.<i>`), a
 * footnote (`footnote`) and a call-out (`cta`, shown when `ctaHref` is set).
 * @param {{ prefix: string, notes?: {icon?, accent?}[], cards: {icon?, accent?, ordered?}[], ctaHref?: string }} props
 */
const ProgramContent = ({ prefix, notes = [], cards, ctaHref, children }) => {
  const has = useHasText();
  return (
    <section className="section">
      <div className="container stack">
        {has(`${prefix}.intro`) && (
          <div className="lead-panel">
            <p>
              <Text k={`${prefix}.intro`} />
            </p>
          </div>
        )}
        {notes.map((note, i) => (
          <Callout key={i} icon={note.icon} accent={note.accent}>
            <Text k={`${prefix}.notes.${i}`} />
          </Callout>
        ))}
        {cards?.length > 0 && (
          <div className="info-grid">
            {cards.map((card, i) => (
              <InfoCard key={i} prefix={`${prefix}.cards.${i}`} {...card} />
            ))}
          </div>
        )}
        {children}
        {has(`${prefix}.footnote`) && (
          <p className="footnote">
            <Text k={`${prefix}.footnote`} />
          </p>
        )}
        {ctaHref && <CtaBanner prefix={`${prefix}.cta`} action={{ href: ctaHref }} />}
      </div>
    </section>
  );
};

export default ProgramContent;
