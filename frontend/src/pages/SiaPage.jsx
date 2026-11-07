import React from 'react';
import PageLayout from '../components/common/PageLayout';
import ProgramContent from '../components/sections/ProgramContent';
import { Text } from '../content/Text';
import { useText } from '../content/useText';

// Card titles and points are the texts sia.cards.<i>.title / .items.
const CARDS = [{ icon: 'fa-check-circle' }, { icon: 'fa-refresh' }, { icon: 'fa-trophy', accent: true }, { icon: 'fa-lightbulb-o' }];

const SiaPage = () => {
  const t = useText();
  return (
  <PageLayout
    title="Start-Up-In AIC (SIA)"
    hero={{
      prefix: 'sia.hero',
      breadcrumbs: [{ label: 'Programs' }, { label: 'SIA' }],
      actions: (
        <a className="btn btn--accent" href={t('links.siaForm')} target="_blank" rel="noopener noreferrer">
          <Text k="sia.hero.button" /> <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      ),
    }}
  >
    <ProgramContent prefix="sia" cards={CARDS} ctaHref={t('links.siaForm')} />
  </PageLayout>
);
};

export default SiaPage;
