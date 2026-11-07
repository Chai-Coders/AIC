import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import SectionHeader from '../components/common/SectionHeader';
import { CtaBanner, InfoCard } from '../components/sections/ProgramContent';
import { Text } from '../content/Text';
import { useText } from '../content/useText';

// Titles and texts are summary.pillars.<i>.title / .text.
const PILLAR_COUNT = 4;

const SummaryPage = () => {
  const t = useText();
  return (
  <PageLayout
    title="Who we are"
    hero={{ prefix: 'summary.hero', breadcrumbs: [{ label: 'About' }, { label: 'Who we are' }] }}
  >
    <section className="section section--white">
      <div className="container split">
        <div className="split__copy">
          <p className="eyebrow">
            <Text k="summary.story.eyebrow" />
          </p>
          <h2 className="section-title">
            <Text k="summary.story.title" />
          </h2>
          <p className="section-lead">
            <Text k="summary.story.lead" />
          </p>
          <p className="split__text">
            <Text k="summary.story.text" />
          </p>
          <div className="btn-row">
            <a className="btn btn--primary" href={t('links.apply')} target="_blank" rel="noopener noreferrer">
              <Text k="summary.story.apply" />
            </a>
            <Link className="btn btn--outline" to="/aicteam">
              <Text k="summary.story.team" />
            </Link>
          </div>
        </div>
        <div className="split__media media-frame">
          <img src="/img/site/hero-1.jpg" alt="The incubation floor at AIC-IIITKottayam" loading="lazy" width="2000" height="1333" />
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <SectionHeader prefix="summary.pillars" />
        <ol className="pillars">
          {Array.from({ length: PILLAR_COUNT }, (_, i) => (
            <li key={i} className="pillar">
              <span className="pillar__num">{String(i + 1).padStart(2, '0')}</span>
              <h3>
                <Text k={`summary.pillars.${i}.title`} />
              </h3>
              <p>
                <Text k={`summary.pillars.${i}.text`} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="section section--white">
      <div className="container info-grid">
        <InfoCard icon="fa-compass" prefix="summary.cards.vision">
          <p className="info-card__text">
            <Text k="summary.cards.vision.text" />
          </p>
          <p className="info-card__subhead">
            <Text k="summary.cards.vision.missionTitle" />
          </p>
        </InfoCard>

        <InfoCard icon="fa-university" prefix="summary.cards.host">
          <p className="info-card__text">
            <Text k="summary.cards.host.text" />
          </p>
          <div className="card__footer">
            <a className="text-link" href={t('links.host')} target="_blank" rel="noopener noreferrer">
              <Text k="summary.cards.host.link" /> <i className="fa fa-external-link" aria-hidden="true" />
            </a>
          </div>
        </InfoCard>

        <InfoCard icon="fa-flask" prefix="summary.cards.research">
          <p className="info-card__text">
            <Text k="summary.cards.research.text" />
          </p>
          <div className="media-frame info-card__media">
            <img src="/img/blog-post.jpg" alt="Research objectives of AIC-IIITKottayam" loading="lazy" />
          </div>
        </InfoCard>

        <InfoCard icon="fa-cogs" prefix="summary.cards.workbench" accent>
          <p className="info-card__text">
            <Text k="summary.cards.workbench.text" />
          </p>
        </InfoCard>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <CtaBanner prefix="summary.cta" action={{ href: t('links.apply'), icon: 'fa-arrow-right' }} />
      </div>
    </section>
  </PageLayout>
);
};

export default SummaryPage;
