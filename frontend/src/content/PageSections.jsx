import React, { Children, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { fetchPageSections } from '../api/content';
import { cdnImageProps } from '../lib/image';
import { AGENT_MODE } from './editMode';
import { normalizePagePath, SECTION_MAP } from './sectionMap';

/** One section added from the CMS, built from the site's own styles. */
const CustomSection = ({ section }) => {
  const paragraphs = section.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const url = section.button_url;
  const button =
    section.button_label && url ? (
      <div className="btn-row" style={{ marginTop: '1.5rem' }}>
        {url.startsWith('/') ? (
          <Link className="btn btn--primary" to={url}>{section.button_label}</Link>
        ) : (
          <a className="btn btn--primary" href={url} target="_blank" rel="noopener noreferrer">{section.button_label}</a>
        )}
      </div>
    ) : null;
  const copy = (
    <>
      {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
      <h2 className="section-title">{section.heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className={section.image ? 'split__text' : 'section-lead'} style={{ whiteSpace: 'pre-line' }}>{p}</p>
      ))}
      {button}
    </>
  );
  return (
    <section className={`section${section.background === 'white' ? ' section--white' : ''}`} data-custom-section={section.id}>
      {section.image ? (
        <div className="container split">
          <div className="split__copy">{copy}</div>
          <div className="split__media media-frame">
            <img {...cdnImageProps(section.image, [800, 1200], '(min-width: 900px) 50vw, 100vw')} alt={section.alt_text || ''} loading="lazy" decoding="async" />
          </div>
        </div>
      ) : (
        <div className="container container--narrow">{copy}</div>
      )}
    </section>
  );
};

/**
 * Renders a page's parts with the sections added from the CMS between them. Each
 * child lines up with an entry in SECTION_MAP.
 */
const PageSections = ({ children }) => {
  const { pathname } = useLocation();
  const { data: sections } = useApi(fetchPageSections);
  const path = normalizePagePath(pathname);
  const parts = Children.toArray(children);
  const anchors = (SECTION_MAP[path] ?? []).map((a) => a.id);

  const here = sections
    .filter((s) => s.page === path)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const after = (anchor) => here.filter((s) => s.after === anchor).map((s) => <CustomSection key={s.id} section={s} />);
  const placed = new Set(anchors.slice(0, parts.length));

  useEffect(() => {
    // Lets the CMS's tests check SECTION_MAP against the page.
    if (AGENT_MODE) document.documentElement.dataset.aicParts = `${path} ${parts.length}`;
  }, [path, parts.length]);

  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={part.key ?? i}>
          {/* A part can render nothing, so counting elements can't say which is which. */}
          {AGENT_MODE && anchors[i] && <span hidden data-part-start={anchors[i]} />}
          {part}
          {anchors[i] && after(anchors[i])}
        </React.Fragment>
      ))}
      {/* A section whose place no longer exists still shows, at the end. */}
      {here.filter((s) => !placed.has(s.after)).map((s) => <CustomSection key={s.id} section={s} />)}
    </>
  );
};

export default PageSections;
