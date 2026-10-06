import React from 'react';
import PageLayout from '../components/common/PageLayout';
import ProgramContent from '../components/sections/ProgramContent';
import { SIA_FORM_URL } from '../data/site';

const CARDS = [
  {
    icon: 'fa-check-circle',
    title: 'Key features',
    items: [
      'Structured launch programme in partnership with global leaders',
      'Complete support from idea validation, IP and marketing to seed funding and acceleration',
      'Mentoring, company formation and incubation facilities',
      'Completely free company registration and incubation for selected teams*',
      '50+ member mentor panel of global leaders across domains',
      'Virtual and physical incubation facilities',
      'Office space, prototyping labs and makerspace access',
      'Support for innovative ideas from all domains',
    ],
  },
  {
    icon: 'fa-refresh',
    title: 'Programme flow',
    items: [
      'Application screening and cohort onboarding',
      'Structured mentoring with domain experts and seasoned founders',
      'Product validation, prototype support and market readiness',
      'Business model refinement with branding and go-to-market guidance',
      'Demo day readiness and investor / ecosystem connect',
    ],
  },
  {
    icon: 'fa-trophy',
    title: 'Expected outcome',
    accent: true,
    items: [
      'Startup ideas transformed into validated, viable business opportunities',
      'Teams become investment-ready and incubation-ready',
      'Stronger product-market fit with a clear commercialisation roadmap',
      'Entrepreneurial capability for sustainable long-term scaling',
    ],
  },
  {
    icon: 'fa-lightbulb-o',
    title: 'Who can apply',
    items: [
      'Aspiring student entrepreneurs and academic innovators',
      'Early-stage startup teams with functional or pre-MVP concepts',
      'Founders seeking seed support, mentorship and cloud / lab infrastructure',
      'Innovators across IoT, AI/ML, healthcare, agritech, cleantech and allied domains',
    ],
  },
];

const SiaPage = () => (
  <PageLayout
    title="Start-Up-In AIC (SIA)"
    hero={{
      eyebrow: 'Pre-incubation programme',
      title: 'Start-Up-In AIC (SIA)',
      description:
        'A comprehensive support scheme for budding entrepreneurs, innovators and early-stage startup teams at AIC-IIIT Kottayam.',
      breadcrumbs: [{ label: 'Programs' }, { label: 'SIA' }],
      actions: (
        <a className="btn btn--accent" href={SIA_FORM_URL} target="_blank" rel="noopener noreferrer">
          Apply for the cohort <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      ),
    }}
  >
    <ProgramContent
      intro={
        <p>
          <strong>AIC-IIIT Kottayam</strong> is inviting applications for its 1st cohort of{' '}
          <strong>SIA (Start-Up-In AIC)</strong>. AIC (Atal Incubation Centre) IIIT Kottayam is a Section 8 non-profit
          organisation under the AIM-NITI Aayog scheme of the Government of India.
        </p>
      }
      cards={CARDS}
      footnote="*Stamp duty and statutory government fees, if any, are not included in the fee waiver."
      cta={{
        title: 'Ready to apply for SIA?',
        text: 'Submit your application for the 1st cohort and fast-track your entrepreneurial journey with AIC-IIIT Kottayam.',
        action: { label: 'Apply on Google Forms', href: SIA_FORM_URL },
      }}
    />
  </PageLayout>
);

export default SiaPage;
