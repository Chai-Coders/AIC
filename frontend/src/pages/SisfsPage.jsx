import React from 'react';
import PageLayout from '../components/common/PageLayout';
import ProgramContent from '../components/sections/ProgramContent';
import { SISFS_URL } from '../data/site';
import { Text } from '../content/Text';

// Card titles and points are the texts sisfs.cards.<i>.title / .items.
const CARDS = [
  { icon: 'fa-check-circle' },
  { icon: 'fa-refresh' },
  { icon: 'fa-trophy', accent: true },
  { icon: 'fa-list-ol', ordered: true },
];

const SisfsPage = () => (
  <PageLayout
    title="Startup India Seed Fund Scheme (SISFS)"
    hero={{
      prefix: 'sisfs.hero',
      breadcrumbs: [{ label: 'Programs' }, { label: 'SISFS' }],
      actions: (
        <a className="btn btn--accent" href={SISFS_URL} target="_blank" rel="noopener noreferrer">
          <Text k="sisfs.hero.button" /> <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      ),
    }}
  >
    <ProgramContent prefix="sisfs" notes={[{ icon: 'fa-inr' }]} cards={CARDS} ctaHref={SISFS_URL} />
  </PageLayout>
);

export default SisfsPage;
