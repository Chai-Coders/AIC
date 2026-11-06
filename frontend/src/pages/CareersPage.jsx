import React from 'react';
import PageLayout from '../components/common/PageLayout';
import { Callout, CtaBanner, InfoCard } from '../components/sections/ProgramContent';
import { formatDate } from '../lib/format';
import { useList } from '../content/useText';
import { Text } from '../content/Text';

// Each position's texts are careers.positions.<i>.title / .type / .summary.
const POSITIONS = [{ pdf: '/pdfs/CEO-Position.pdf', deadline: '2025-12-25' }, {}];

// Card titles and points are the texts careers.cards.<i>.title / .items.
const INTERNSHIP_CARDS = [{ icon: 'fa-bullseye' }, { icon: 'fa-graduation-cap' }, { icon: 'fa-tasks' }, { icon: 'fa-star', accent: true }];

const isPast = (date) => date && new Date(`${date}T23:59:59`) < new Date();

const PositionCard = ({ position, index }) => {
  const closed = isPast(position.deadline);
  const k = (field) => `careers.positions.${index}.${field}`;
  return (
    <article className="card position-card">
      <div className="position-card__head">
        <span className="chip">
          <Text k={k('type')} />
        </span>
        {position.deadline && (
          <span className={`chip ${closed ? '' : 'chip--accent'}`}>
            {closed ? (
              <Text k="careers.positions.closed" />
            ) : (
              <>
                <Text k="careers.positions.applyBy" /> {formatDate(position.deadline)}
              </>
            )}
          </span>
        )}
      </div>
      <h3 className="card__title">
        <Text k={k('title')} />
      </h3>
      <p className="card__text">
        <Text k={k('summary')} />
      </p>
      {position.pdf && (
        <div className="card__footer">
          <a className="text-link" href={position.pdf} target="_blank" rel="noopener noreferrer">
            <i className="fa fa-file-pdf-o" aria-hidden="true" /> <Text k="careers.positions.pdf" />
          </a>
        </div>
      )}
    </article>
  );
};

const CareersPage = () => {
  const emails = useList()('careers.cta.emails');
  return (
    <PageLayout title="Careers" hero={{ prefix: 'careers.hero', breadcrumbs: [{ label: 'Careers' }] }}>
      <section className="section">
        <div className="container stack">
          <h2 className="section-title section-title--sm">
            <Text k="careers.positions.title" />
          </h2>
          <div className="grid grid--2">
            {POSITIONS.map((p, i) => (
              <PositionCard key={i} position={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container stack">
          <h2 className="section-title section-title--sm">
            <Text k="careers.internship.title" />
          </h2>
          <Callout icon="fa-clock-o">
            <Text k="careers.internship.note" />
          </Callout>
          <div className="info-grid">
            {INTERNSHIP_CARDS.map((card, i) => (
              <InfoCard key={i} prefix={`careers.cards.${i}`} {...card} />
            ))}
          </div>
          <CtaBanner
            prefix="careers.cta"
            action={
              <a
                className="btn btn--accent"
                href={`mailto:${emails.join(',')}?subject=${encodeURIComponent('Application for career / internship at AIC-IIITK')}`}
              >
                <Text k="careers.cta.button" /> <i className="fa fa-envelope" aria-hidden="true" />
              </a>
            }
          />
        </div>
      </section>
    </PageLayout>
  );
};

export default CareersPage;
