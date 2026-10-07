import React from 'react';

/**
 * Eyebrow + title + lead paragraph used at the top of every section.
 * `align`: 'left' | 'center'. `aside` renders on the right (split layout).
 */
const SectionHeader = ({ eyebrow, title, lead, align = 'left', aside, id }) => {
  const classes = ['section-head', align === 'center' && 'section-head--center', aside && 'section-head--split']
    .filter(Boolean)
    .join(' ');

  const copy = (
    <>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="section-title" id={id}>
        {title}
      </h2>
      {lead && <p className="section-lead">{lead}</p>}
    </>
  );

  return (
    <header className={classes}>
      {aside ? (
        <>
          <div>{copy}</div>
          {aside}
        </>
      ) : (
        copy
      )}
    </header>
  );
};

export default SectionHeader;
