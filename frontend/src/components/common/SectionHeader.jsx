import React from 'react';
import { useHasText } from '../../content/useText';
import { Text } from '../../content/Text';

/**
 * Eyebrow + title + lead paragraph used at the top of every section, read
 * from the texts `<prefix>.eyebrow`, `<prefix>.title` and `<prefix>.lead`.
 * `align`: 'left' | 'center'. `aside` renders on the right (split layout).
 */
const SectionHeader = ({ prefix, align = 'left', aside, id }) => {
  const has = useHasText();
  const classes = ['section-head', align === 'center' && 'section-head--center', aside && 'section-head--split']
    .filter(Boolean)
    .join(' ');

  const copy = (
    <>
      {has(`${prefix}.eyebrow`) && (
        <p className="eyebrow">
          <Text k={`${prefix}.eyebrow`} />
        </p>
      )}
      <h2 className="section-title" id={id}>
        <Text k={`${prefix}.title`} />
      </h2>
      {has(`${prefix}.lead`) && (
        <p className="section-lead">
          <Text k={`${prefix}.lead`} />
        </p>
      )}
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
