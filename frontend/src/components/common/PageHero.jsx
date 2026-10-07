import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Title band at the top of every inner page.
 * @param {{ eyebrow?: string, title: React.ReactNode, description?: React.ReactNode,
 *           breadcrumbs?: {label: string, to?: string}[], actions?: React.ReactNode }} props
 */
const PageHero = ({ eyebrow, title, description, breadcrumbs = [], actions }) => (
  <section className="page-hero">
    <div className="container page-hero__inner">
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumbs">
          <li>
            <Link to="/">Home</Link>
          </li>
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.label} aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}>
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
            </li>
          ))}
        </ol>
      </nav>
      {eyebrow && <p className="page-hero__eyebrow">{eyebrow}</p>}
      <h1 className="page-hero__title">{title}</h1>
      {description && <p className="page-hero__desc">{description}</p>}
      {actions && <div className="btn-row page-hero__actions">{actions}</div>}
    </div>
  </section>
);

export default PageHero;
