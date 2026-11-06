import React from 'react';
import { Link } from 'react-router-dom';
import { FIELDS } from '../../content/registry';
import { useHasText } from '../../content/useText';
import { Text } from '../../content/Text';

/**
 * Title band at the top of every inner page. Its eyebrow, title and
 * description are the texts `<prefix>.eyebrow`, `<prefix>.title` and `<prefix>.desc`.
 * @param {{ prefix: string, breadcrumbs?: {label: string, to?: string}[], actions?: React.ReactNode }} props
 */
/** A breadcrumb's wording, editable as crumb.<its words> in the registry. */
const Crumb = ({ label }) => {
  const key = `crumb.${label.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return key in FIELDS ? <Text k={key} /> : label;
};

const PageHero = ({ prefix, breadcrumbs = [], actions }) => {
  const has = useHasText();
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link to="/"><Text k="words.home" /></Link>
            </li>
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.label} aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}>
                {crumb.to ? <Link to={crumb.to}><Crumb label={crumb.label} /></Link> : <Crumb label={crumb.label} />}
              </li>
            ))}
          </ol>
        </nav>
        {has(`${prefix}.eyebrow`) && (
          <p className="page-hero__eyebrow">
            <Text k={`${prefix}.eyebrow`} />
          </p>
        )}
        <h1 className="page-hero__title">
          <Text k={`${prefix}.title`} />
        </h1>
        {has(`${prefix}.desc`) && (
          <p className="page-hero__desc">
            <Text k={`${prefix}.desc`} />
          </p>
        )}
        {actions && <div className="btn-row page-hero__actions">{actions}</div>}
      </div>
    </section>
  );
};

export default PageHero;
