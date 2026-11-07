import React from 'react';
import PageLayout from '../components/common/PageLayout';
import ProgramContent from '../components/sections/ProgramContent';
import { Text } from '../content/Text';
import { useText } from '../content/useText';

// Card titles and points are the texts sisfs.cards.<i>.title / .items.
const CARDS = [
  { icon: 'fa-check-circle' },
  { icon: 'fa-refresh' },
  { icon: 'fa-trophy', accent: true },
  { icon: 'fa-list-ol', ordered: true },
];

const SisfsPage = () => {
  const t = useText();
  return (
  <PageLayout
    title="Startup India Seed Fund Scheme (SISFS)"
    hero={{
      prefix: 'sisfs.hero',
      breadcrumbs: [{ label: 'Programs' }, { label: 'SISFS' }],
      actions: (
        <a className="btn btn--accent" href={t('links.sisfs')} target="_blank" rel="noopener noreferrer">
          <Text k="sisfs.hero.button" /> <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      ),
    }}
  >
    <ProgramContent prefix="sisfs" notes={[{ icon: 'fa-inr' }]} cards={CARDS} ctaHref={t('links.sisfs')} />
  </PageLayout>
);
};

export default SisfsPage;
