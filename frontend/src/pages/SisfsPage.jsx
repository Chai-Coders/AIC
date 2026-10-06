import React from 'react';
import PageLayout from '../components/common/PageLayout';
import ProgramContent from '../components/sections/ProgramContent';
import { SISFS_URL } from '../data/site';

const CARDS = [
  {
    icon: 'fa-check-circle',
    title: 'What the fund supports',
    items: ['Proof of concept', 'Prototype development', 'Product trials', 'Market entry', 'Commercialisation'],
  },
  {
    icon: 'fa-refresh',
    title: 'Programme flow',
    items: [
      'Startup application and eligibility review',
      'Screening, due diligence and selection by an expert committee',
      'Milestone-based support through mentoring and reviews',
      'Fund utilisation for validation, trials and commercialisation',
      'Periodic reporting and progress evaluation through the incubator',
    ],
  },
  {
    icon: 'fa-trophy',
    title: 'Expected outcome',
    accent: true,
    items: [
      'Early-stage startups move from concept to market-ready offerings',
      'Improved commercialisation pipeline through milestone support',
      'Job creation and sustainable, innovation-led growth',
      'Increased access to market and investor opportunities',
    ],
  },
  {
    icon: 'fa-list-ol',
    title: 'Eligibility criteria',
    ordered: true,
    items: [
      'A DPIIT-recognised startup incorporated less than 2 years before applying.',
      'A business idea with market fit, viable commercialisation and scope for scale.',
      'Uses technology in its core product, service or business model.',
      'Preference for social impact, waste / water management, edtech, agritech, healthcare, energy, robotics, etc.',
      'Has not received more than ₹10 lakh of monetary support under any other Central or State Government scheme.',
      'At least 51% shareholding by Indian promoters.',
    ],
  },
];

const SisfsPage = () => (
  <PageLayout
    title="Startup India Seed Fund Scheme (SISFS)"
    hero={{
      eyebrow: 'Incubation & seed funding',
      title: 'Startup India Seed Fund Scheme',
      description:
        'AIC IIIT Kottayam Foundation was selected under SISFS in 2021. Eligible startups can receive funding of up to ₹50 lakh.',
      breadcrumbs: [{ label: 'Programs' }, { label: 'SISFS' }],
      actions: (
        <a className="btn btn--accent" href={SISFS_URL} target="_blank" rel="noopener noreferrer">
          Apply on the Seed Fund portal <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      ),
    }}
  >
    <ProgramContent
      intro={
        <p>
          <strong>SISFS (Startup India Seed Fund Scheme)</strong> is a Government of India initiative to build a strong
          ecosystem for nurturing innovation and startups that drives sustainable economic growth and generates
          large-scale employment. AIC IIITK builds a startup ecosystem that bridges entrepreneurs and innovation from
          local to national and international markets.
        </p>
      }
      notes={[
        {
          icon: 'fa-inr',
          text: 'The scheme provides financial assistance to startups via a national corpus of ₹945 crore, disbursed through selected incubators across India in 2021-25.',
        },
      ]}
      cards={CARDS}
      cta={{
        title: 'Ready to apply for the Seed Fund?',
        text: 'Apply through the official Startup India portal and choose AIC IIIT Kottayam Foundation as your incubator.',
        action: { label: 'Go to Seed Fund portal', href: SISFS_URL },
      }}
    />
  </PageLayout>
);

export default SisfsPage;
