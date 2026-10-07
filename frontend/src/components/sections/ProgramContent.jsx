import React from 'react';

/** Icon + heading + bullet list card used on programme pages. */
export const InfoCard = ({ icon, title, items, ordered = false, accent = false, children }) => (
  <article className={`card info-card ${accent ? 'info-card--accent' : ''}`}>
    <div className="info-card__head">
      {icon && <i className={`fa ${icon}`} aria-hidden="true" />}
      <h3>{title}</h3>
    </div>
    {children}
    {items && (
      <ul className={`check-list ${ordered ? 'check-list--numbered' : ''}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )}
  </article>
);

export const Callout = ({ icon = 'fa-info-circle', accent = false, children }) => (
  <div className={`callout ${accent ? 'callout--accent' : ''}`}>
    <i className={`fa ${icon}`} aria-hidden="true" />
    <p>{children}</p>
  </div>
);

/** Dark call-to-action banner. `action` is { label, href, icon? } (external) or a React node. */
export const CtaBanner = ({ title, text, action }) => (
  <aside className="cta-banner">
    <div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
    {action &&
      (React.isValidElement(action) ? (
        action
      ) : (
        <a className="btn btn--accent" href={action.href} target="_blank" rel="noopener noreferrer">
          {action.label} <i className={`fa ${action.icon || 'fa-external-link'}`} aria-hidden="true" />
        </a>
      ))}
  </aside>
);

/**
 * Standard programme page body: intro, notes, a grid of info cards and a CTA.
 * @param {{ intro?: React.ReactNode, notes?: {icon?, accent?, text}[], cards: object[], footnote?: string, cta?: object }} props
 */
const ProgramContent = ({ intro, notes = [], cards, footnote, cta, children }) => (
  <section className="section">
    <div className="container stack">
      {intro && <div className="lead-panel">{intro}</div>}
      {notes.map((note) => (
        <Callout key={note.text} icon={note.icon} accent={note.accent}>
          {note.text}
        </Callout>
      ))}
      {cards?.length > 0 && (
        <div className="info-grid">
          {cards.map((card) => (
            <InfoCard key={card.title} {...card} />
          ))}
        </div>
      )}
      {children}
      {footnote && <p className="footnote">{footnote}</p>}
      {cta && <CtaBanner {...cta} />}
    </div>
  </section>
);

export default ProgramContent;
