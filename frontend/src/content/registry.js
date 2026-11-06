// Every text on the website that can be edited from the CMS ("Site text"),
// grouped by page the way the CMS lists them.
//
// The value written here is what the website shows until someone edits the
// text in the CMS (edits are stored in Convex, see convex-backend/convex/
// siteText.ts). Keys are permanent: renaming one loses its published edit.
//
// Kinds:
//   line  one line of text
//   text  a paragraph
//   rich  a paragraph where *words* are set in italics and **words** in bold
//   list  one item per line (bullet points, email addresses, ...)

const line = (label, value) => ({ label, kind: 'line', value });
const text = (label, value) => ({ label, kind: 'text', value });
const rich = (label, value) => ({ label, kind: 'rich', value });
const list = (label, value) => ({ label, kind: 'list', value: value.join('\n') });

/** A named group of fields whose keys all start with `prefix`. */
const group = (name, prefix, fields) => ({
  name,
  fields: Object.entries(fields).map(([key, field]) => ({ ...field, key: `${prefix}.${key}` })),
});

/**
 * Repeated blocks, like the three programme cards: item `i` gets keys
 * `<sub>.<i>.<field>` (or `<i>.<field>` without `sub`) and labels such as
 * "Programme 2 title".
 */
const each = (noun, items, sub) =>
  Object.fromEntries(
    items.flatMap((item, i) =>
      Object.entries(item).map(([field, f]) => [
        `${sub ? `${sub}.` : ''}${i}.${field}`,
        { ...f, label: `${noun} ${i + 1} ${f.label}` },
      ])
    )
  );

/** Single lines keyed `<sub>.0`, `<sub>.1`, ... labelled "<noun> 1", "<noun> 2", ... */
const lines = (noun, sub, values) =>
  Object.fromEntries(values.map((value, i) => [`${sub}.${i}`, line(`${noun} ${i + 1}`, value)]));

/** Hero band at the top of inner pages (see PageHero). */
const hero = (prefix, eyebrow, title, desc, extra = {}) =>
  group('Page title', `${prefix}.hero`, {
    eyebrow: line('Eyebrow', eyebrow),
    title: line('Title', title),
    desc: text('Description', desc),
    ...extra,
  });

/** Info cards on programme pages: a title and bullet points each. */
const cards = (prefix, items, name = 'Cards') =>
  group(name, `${prefix}.cards`, each('Card', items.map(([title, points]) => ({
    title: line('title', title),
    items: list('points', points),
  }))));

/** Dark call-out banner at the end of a page (see CtaBanner). */
const cta = (prefix, title, desc, button) =>
  group('Call-out', `${prefix}.cta`, {
    title: line('Title', title),
    text: text('Text', desc),
    button: line('Button', button),
  });

// ---------------------------------------------------------------------------
// Shown on every page
// ---------------------------------------------------------------------------

const HEADER = group('Header menu', 'nav', {
  'home.label': line('Home link', 'Home'),
  'about.label': line('About menu', 'About'),
  ...each('About item', [
    { label: line('name', 'Who we are'), desc: line('description', 'Mission, vision and facilities') },
    { label: line('name', 'Board of Governors'), desc: line('description', 'Leadership and governance') },
    { label: line('name', 'Our Team'), desc: line('description', 'The people running AIC') },
    { label: line('name', 'Mentors'), desc: line('description', 'Our international mentor panel') },
  ], 'about'),
  'programs.label': line('Programs menu', 'Programs'),
  ...each('Programs item', [
    { label: line('name', 'Pre-Incubation (SIA)'), desc: line('description', 'Start-Up-In AIC cohort') },
    { label: line('name', 'Incubation (SISFS)'), desc: line('description', 'Startup India Seed Fund') },
    { label: line('name', 'Acceleration'), desc: line('description', 'Scale-up support for startups') },
  ], 'programs'),
  'portfolio.label': line('Portfolio link', 'Portfolio'),
  'media.label': line('Media menu', 'Media'),
  ...each('Media item', [
    { label: line('name', 'News & Updates'), desc: line('description', 'Announcements and events') },
    { label: line('name', 'Gallery'), desc: line('description', 'Moments from the centre') },
  ], 'media'),
  'careers.label': line('Careers link', 'Careers'),
  contact: line('Contact button', 'Contact'),
  apply: line('Apply button', 'Apply now'),
});

const FOOTER = group('Footer', 'footer', {
  'cta.title': rich('Banner heading', 'Building something that matters? *Build it with us.*'),
  'cta.apply': line('Banner apply button', 'Apply for incubation'),
  'cta.talk': line('Banner contact button', 'Talk to us'),
  about: text(
    'About the centre',
    'Atal Incubation Centre at the Indian Institute of Information Technology Kottayam. Supported by the Atal Innovation Mission, NITI Aayog.'
  ),
  'centre.title': line('First link column heading', 'The centre'),
  ...lines('First column link', 'centre', ['Who we are', 'Board of Governors', 'Our team', 'Mentors', 'Careers']),
  'programmes.title': line('Second link column heading', 'Programmes'),
  ...lines('Second column link', 'programmes', [
    'Pre-incubation (SIA)',
    'Seed Fund (SISFS)',
    'Acceleration',
    'Portfolio',
    'News & gallery',
  ]),
  'contact.title': line('Contact column heading', 'Visit & contact'),
  directions: line('Directions link', 'Get directions'),
  copyright: line('Copyright (after the year)', 'AIC IIIT Kottayam Foundation. All rights reserved.'),
  hosted: line('Hosted by', 'Hosted by'),
  host: line('Host institute link', 'IIIT Kottayam'),
});

const CONTACT = group('Contact details', 'contact', {
  address: list('Address (one line each)', ['Building no. 340,', 'Karoor Valavoor P.O.,', 'Kottayam, Kerala 686635.']),
  emails: list('Email addresses (one per line)', ['incubate@iiitkottayam.ac.in', 'ceo-aic@iiikottayam.ac.in']),
  phones: list('Phone numbers (one per line; the footer shows the first two)', [
    '+91-482-2202156',
    '+91-482-2202155',
    '+91-9400063494',
    '+91-9443543746',
  ]),
});

export const SHARED = [HEADER, FOOTER, CONTACT];

// Used on more than one page.
const NEWS_CARD = group('News cards', 'news.card', { more: line('Read more link', 'Read more') });
const PEOPLE_TABS = group('People tabs', 'people.tabs', {
  board: line('Board tab', 'Board of Governors'),
  team: line('Team tab', 'AIC Team'),
  mentors: line('Mentors tab', 'Mentors'),
});

// ---------------------------------------------------------------------------
// Pages. `path` is where the CMS preview opens the page.
// ---------------------------------------------------------------------------

const HOME = [
  group('Hero', 'home.hero', {
    eyebrow: line('Eyebrow', 'Atal Incubation Centre · IIIT Kottayam'),
    title: rich('Headline', 'From first prototype to a *funded company.*'),
    desc: text(
      'Intro paragraph',
      'We back early-stage founders in IoT, cloud, AI and societal technology with mentors, labs and seed capital, from inside an Institute of National Importance.'
    ),
    apply: line('Primary button', 'Apply for incubation'),
    explore: line('Secondary button', 'Explore programmes'),
    ...lines('Photo caption', 'caption', [
      'IIIT Kottayam campus, Valavoor',
      'The incubation floor at AIC',
      'A startup review session',
    ]),
  }),
  group('Numbers', 'home.stats', each('Stat', [
    { value: line('value', '₹50L'), label: line('label', 'Seed funding per startup, via SISFS') },
    { value: line('value', '42'), label: line('label', 'Startups supported') },
    { value: line('value', '141'), label: line('label', 'Jobs created') },
    { value: line('value', '11'), label: line('label', 'IPs generated') },
  ])),
  group('About', 'home.about', {
    eyebrow: line('Eyebrow', 'About the centre'),
    title: rich('Heading', 'An incubator with the depth of a *national institute.*'),
    lead: text(
      'Intro paragraph',
      'AIC-IIITKottayam gives founders what is hardest to find early on: serious technical depth, honest mentorship and the credibility of an institution behind them.'
    ),
    backers: line('Supporters label', 'Supported by'),
    ...each('Link', [
      {
        title: line('title', 'Who we are'),
        text: text('text', 'The incubation centre of the Indian Institute of Information Technology Kottayam, under the Atal Innovation Mission of the Government of India.'),
      },
      {
        title: line('title', 'Our people'),
        text: text('text', 'Governed by leading industrialists and academicians, run by a dedicated team, and backed by a global mentor panel.'),
      },
      {
        title: line('title', 'Sustainability'),
        text: text('text', 'We are building a lasting ecosystem of entrepreneurs in the IoT cloud domain and beyond.'),
      },
    ], 'links'),
    more: line('Read more link', 'Read more'),
  }),
  group('Programmes', 'home.programs', {
    eyebrow: line('Eyebrow', 'Programmes'),
    title: rich('Heading', 'A path for every stage, *from idea to scale.*'),
    lead: text('Intro paragraph', 'Join where you are today. Each programme hands you on to the next as your company grows.'),
    ...each('Programme', [
      {
        stage: line('stage', 'Pre-incubation'),
        title: line('title', 'Start-Up-In AIC'),
        text: text('description', 'A structured launch programme for student innovators and pre-MVP teams, from idea validation and IP to company formation.'),
        factLabel: line('fact label', 'Best for'),
        fact: line('fact', 'Idea to first prototype'),
        link: line('link', 'About SIA'),
      },
      {
        stage: line('stage', 'Incubation & seed funding'),
        title: line('title', 'Startup India Seed Fund'),
        text: text('description', 'Milestone-based funding for DPIIT-recognised startups to prove concepts, run product trials and enter the market.'),
        factLabel: line('fact label', 'Funding'),
        fact: line('fact', 'Up to ₹50 lakh'),
        link: line('link', 'About SISFS'),
      },
      {
        stage: line('stage', 'Acceleration'),
        title: line('title', 'Scale-up programme'),
        text: text('description', 'Strategic mentoring, partner networks, pilots and investor readiness for startups that are ready to grow.'),
        factLabel: line('fact label', 'Best for'),
        fact: line('fact', 'Startups with traction'),
        link: line('link', 'About Acceleration'),
      },
    ]),
  }),
  group('What you get', 'home.service', {
    eyebrow: line('Eyebrow', 'What you get'),
    title: rich('Heading', 'Everything a young company needs, under one roof'),
    lead: text('Intro paragraph', 'Mentorship, rapid IP commercialisation and a trusted ecosystem for early-stage founders.'),
    ...each('Tile', [
      ['Capability', 'Training & mentorship', 'Practical and theoretical frameworks that upskill technical teams for product excellence.', ['1-on-1 mentors', 'Tech labs']],
      ['Protection', 'Patent & IP support', 'Fast-track intellectual property guidance and filing with expert legal advisors and faculty.', ['IP guidance', 'Prior-art search']],
      ['Innovation', 'Idea generation hub', 'Turning early concepts into market-ready prototypes through hackathons and ideation sprints.', ['Hackathons', 'Prototyping']],
      ['Growth', 'Marketing & go-to-market', 'Sales strategy, PR and digital outreach to win early users and real market adoption.', ['GTM strategy', 'Product launch']],
      ['Credibility', 'Institutional backing', 'The academic rigour and network of IIIT Kottayam, so investors and customers take you seriously.', ['IIITK network', 'AIM, NITI Aayog']],
      ['Network', 'Investor & global access', 'Introductions to venture capitalists, angel networks and international trade bodies when you are ready to scale.', ['Investor pitch days', 'Demo days']],
    ].map(([tag, title, desc, chips]) => ({
      tag: line('tag', tag),
      title: line('title', title),
      text: text('description', desc),
      chips: list('highlights', chips),
    }))),
  }),
  group('Startups', 'home.startups', {
    eyebrow: line('Eyebrow', 'Portfolio'),
    title: rich('Heading', 'Startups building with AIC'),
    lead: text('Intro paragraph', 'High-growth tech ventures and innovative entrepreneurs incubated at the centre.'),
    button: line('Button', 'View all startups'),
  }),
  group('How we work', 'home.features', {
    eyebrow: line('Eyebrow', 'How we work'),
    title: rich('Heading', 'The AIC-IIITKottayam success formula'),
    lead: text('Intro paragraph', 'Five principles that shape how we support every startup in our programmes.'),
    button: line('Button', 'Apply for recognition'),
    ...each('Principle', [
      ['A strong partnership network', 'We keep our partners, including mentors, close to the startups and customers we serve.'],
      ['Partners reach the centre directly', 'Partner strengths flow into the centre. IISER-TVM, for instance, acts as a knowledge park, and we connect its experts directly with our startups.'],
      ['An expanding network', 'With the support of our partners we keep widening our network of contacts, so founders meet more customers over time.'],
      ['Innovation & R&D, encouraged', 'We invite partners and startups to bring innovative R&D projects, so the expertise of AIC-IIITKottayam keeps growing.'],
      ['Continuous follow-through', 'We check in with the teams we support at regular intervals, so they stay on track and become advocates for the centre.'],
    ].map(([title, desc]) => ({ title: line('title', title), text: text('text', desc) })), 'steps'),
    ...lines('Photo caption', 'photos', ['Mentorship', 'Industry & government', 'Demo days', 'Training', 'Cohorts']),
  }),
  group('Business model', 'home.pricing', {
    eyebrow: line('Eyebrow', 'Business model'),
    title: rich('Heading', 'Simple terms, no surprises'),
    lead: text('Intro paragraph', 'Three ways to work with the centre, depending on how much space, training or hands-on support you need.'),
    ...each('Plan', [
      ['Support contract', '₹5K', 'per month', ['Incubation space', 'Knowledge assistance', '6 to 12 months']],
      ['Training contract', '₹1K', 'per week', ['Incubation space', 'Training support', '1 to 4 weeks']],
      ['Consultancy contract', '₹10K', 'per day', ['Onsite support', 'Consultancy support', 'Network support']],
    ].map(([title, amount, per, features]) => ({
      title: line('title', title),
      amount: line('price', amount),
      per: line('price period', per),
      features: list('features', features),
    }))),
    button: line('Button', 'Register now'),
  }),
  group('News', 'home.news', {
    eyebrow: line('Eyebrow', 'News & updates'),
    title: rich('Heading', 'Latest from the centre'),
    lead: text('Intro paragraph', 'Announcements, events and milestones from AIC-IIITKottayam and our startups.'),
    button: line('Button', 'All news'),
  }),
  NEWS_CARD,
  group('Gallery', 'home.gallery', {
    eyebrow: line('Eyebrow', 'Gallery'),
    title: rich('Heading', 'Life at AIC'),
    lead: text('Intro paragraph', 'Workshops, demo days and everyday moments from the centre.'),
    button: line('Button', 'View gallery'),
  }),
  group('Contact', 'home.contact', {
    eyebrow: line('Eyebrow', 'Contact'),
    title: rich('Heading', 'Talk to the team'),
    lead: text(
      'Intro paragraph',
      'Questions about a programme, eligibility or a partnership? Write to us, call, or visit the centre on the IIIT Kottayam campus.'
    ),
    address: line('Address label', 'Address'),
    directions: line('Directions link', 'Directions'),
    email: line('Email label', 'Email'),
    phone: line('Phone label', 'Phone'),
    'form.title': line('Form heading', 'Send us a message'),
    'form.name': line('Name field', 'Your name'),
    'form.email': line('Email field', 'Email address'),
    'form.message': line('Message field', 'Message'),
    'form.send': line('Send button', 'Send message'),
    'form.sent': text('Message after sending', 'Your email app should open with the message ready to send. Thank you for reaching out.'),
  }),
];

const SUMMARY = [
  hero(
    'summary',
    'About AIC-IIITKottayam',
    'An incubation centre built for societal impact',
    'AIC IIITKottayam Foundation is a non-profit Section 8 company sanctioned under the Atal Innovation Mission (AIM) of the Government of India.'
  ),
  group('Our story', 'summary.story', {
    eyebrow: line('Eyebrow', 'Our story'),
    title: line('Heading', 'Solving real problems for entrepreneurs'),
    lead: text(
      'Intro paragraph',
      'The centre addresses the real-world problems of entrepreneurs with extensive support in knowledge, guidance, mentorship, hands-on training and state-of-the-art incubation infrastructure.'
    ),
    text: text(
      'Second paragraph',
      'Incubatees at AIC-IIITKottayam can rapidly prototype and test their products using 3D printing, advanced computing facilities, hardware realisation labs and IoT cloud platforms, backed by commercialisation and go-to-market advisory.'
    ),
    apply: line('Apply button', 'Apply for incubation'),
    team: line('Team button', 'Meet the team'),
  }),
  group('What incubatees get', 'summary.pillars', {
    eyebrow: line('Eyebrow', 'What incubatees get'),
    title: rich('Heading', 'Everything you need to build'),
    ...each('Pillar', [
      ['Rapid prototyping', '3D printing and hardware realisation labs to turn designs into working products.'],
      ['Advanced computing', 'Computing facilities and IoT cloud platforms for building and testing at scale.'],
      ['Mentorship', 'One-on-one guidance from domain experts, faculty and a global mentor panel.'],
      ['Go-to-market', 'Commercialisation and go-to-market advisory to reach customers sooner.'],
    ].map(([title, desc]) => ({ title: line('title', title), text: text('text', desc) }))),
  }),
  group('Info cards', 'summary.cards', {
    'vision.title': line('Vision card title', 'Vision & mission'),
    'vision.text': rich(
      'Vision',
      '**Vision:** To develop an international business hub for entrepreneurs by providing strong technical innovations that improve society and communities at large.'
    ),
    'vision.missionTitle': line('Mission heading', 'Mission'),
    'vision.items': list('Mission points', [
      'Provide cutting-edge technical support and research guidance to young minds.',
      'Serve as a gateway connecting regional startups to global business hubs.',
      'Empower entrepreneurs to solve real societal challenges through technology.',
    ]),
    'host.title': line('Host card title', 'Our host institute'),
    'host.text': rich(
      'Host card text',
      'AIC-IIITKottayam is hosted by the **Indian Institute of Information Technology Kottayam**, an Institute of National Importance. With visionary academic and research leadership, IIIT Kottayam fosters multidisciplinary technological innovation and entrepreneurial excellence.'
    ),
    'host.link': line('Host card link', 'Visit iiitkottayam.ac.in'),
    'research.title': line('Research card title', 'Research objectives'),
    'research.text': text(
      'Research card text',
      'Our core focus is developing high-impact societal applications using IoT, cloud architectures, AI/ML and cyber-physical systems.'
    ),
    'workbench.title': line('Workbench card title', 'The AIC workbench'),
    'workbench.text': text('Workbench card intro', 'End-to-end support for every incubatee:'),
    'workbench.items': list('Workbench points', [
      'Market opportunity and customer need analysis',
      'One-on-one mentor and domain consultation',
      '3D printing and rapid hardware prototyping',
      'Technical architecture and feasibility verification',
      'IoT cloud services integration and automated testing',
      'Intellectual property (IP) and commercialisation support',
    ]),
  }),
  cta(
    'summary',
    'Ready to build with us?',
    'Apply to the incubation programme and get access to mentors, labs and funding networks.',
    'Apply for incubation'
  ),
];

const STARTUP = [
  hero(
    'startup',
    'Acceleration programme',
    'Scale faster with AIC-IIITKottayam',
    'Dedicated mentoring, technical infrastructure, funding avenues and partner networks for early and growth-stage startups.',
    { apply: line('Apply button', 'Apply for acceleration'), browse: line('Portfolio button', 'Browse portfolio') }
  ),
  cards('startup', [
    ['Key features', [
      'Dedicated acceleration support for growth-stage startups',
      'Mentor network and expert interventions for scale-up challenges',
      'Access to the partner ecosystem, industry connects and market channels',
      'Strategic support in product, operations and business expansion',
    ]],
    ['Programme flow', [
      'Startup selection based on growth potential and market readiness',
      'Goal setting with a milestone-driven acceleration roadmap',
      'Periodic reviews with domain experts and seasoned business mentors',
      'Investor readiness, market access and strategic partnership support',
    ]],
    ['Expected outcome', [
      'Faster go-to-market and improved business traction',
      'Improved fundraising readiness and growth strategy execution',
      'A scalable operating model with stronger market presence',
      'Direct links with institutional investors and industry collaborators',
    ]],
    ['Acceleration highlights', [
      '1-on-1 strategic growth mentorship sessions',
      'Cloud credits, prototyping labs and testing setup',
      'Corporate tie-ups and pilot opportunities with partners',
      'Access to AIM, DPIIT, SISFS and venture funding schemes',
    ]],
  ]),
  group('Portfolio', 'startup.portfolio', {
    eyebrow: line('Eyebrow', 'Portfolio'),
    title: rich('Heading', 'Our promising startups'),
    lead: text('Intro paragraph', 'Ventures incubated and accelerated at AIC-IIITKottayam.'),
  }),
  group('Partners', 'startup.partners', {
    eyebrow: line('Eyebrow', 'Ecosystem'),
    title: rich('Heading', 'Our partners'),
  }),
];

const SIA = [
  hero(
    'sia',
    'Pre-incubation programme',
    'Start-Up-In AIC (SIA)',
    'A comprehensive support scheme for budding entrepreneurs, innovators and early-stage startup teams at AIC-IIIT Kottayam.',
    { button: line('Apply button', 'Apply for the cohort') }
  ),
  group('Introduction', 'sia', {
    intro: rich(
      'Intro paragraph',
      '**AIC-IIIT Kottayam** is inviting applications for its 1st cohort of **SIA (Start-Up-In AIC)**. AIC (Atal Incubation Centre) IIIT Kottayam is a Section 8 non-profit organisation under the AIM-NITI Aayog scheme of the Government of India.'
    ),
    footnote: text('Footnote', '*Stamp duty and statutory government fees, if any, are not included in the fee waiver.'),
  }),
  cards('sia', [
    ['Key features', [
      'Structured launch programme in partnership with global leaders',
      'Complete support from idea validation, IP and marketing to seed funding and acceleration',
      'Mentoring, company formation and incubation facilities',
      'Completely free company registration and incubation for selected teams*',
      '50+ member mentor panel of global leaders across domains',
      'Virtual and physical incubation facilities',
      'Office space, prototyping labs and makerspace access',
      'Support for innovative ideas from all domains',
    ]],
    ['Programme flow', [
      'Application screening and cohort onboarding',
      'Structured mentoring with domain experts and seasoned founders',
      'Product validation, prototype support and market readiness',
      'Business model refinement with branding and go-to-market guidance',
      'Demo day readiness and investor / ecosystem connect',
    ]],
    ['Expected outcome', [
      'Startup ideas transformed into validated, viable business opportunities',
      'Teams become investment-ready and incubation-ready',
      'Stronger product-market fit with a clear commercialisation roadmap',
      'Entrepreneurial capability for sustainable long-term scaling',
    ]],
    ['Who can apply', [
      'Aspiring student entrepreneurs and academic innovators',
      'Early-stage startup teams with functional or pre-MVP concepts',
      'Founders seeking seed support, mentorship and cloud / lab infrastructure',
      'Innovators across IoT, AI/ML, healthcare, agritech, cleantech and allied domains',
    ]],
  ]),
  cta(
    'sia',
    'Ready to apply for SIA?',
    'Submit your application for the 1st cohort and fast-track your entrepreneurial journey with AIC-IIIT Kottayam.',
    'Apply on Google Forms'
  ),
];

const SISFS = [
  hero(
    'sisfs',
    'Incubation & seed funding',
    'Startup India Seed Fund Scheme',
    'AIC IIIT Kottayam Foundation was selected under SISFS in 2021. Eligible startups can receive funding of up to ₹50 lakh.',
    { button: line('Apply button', 'Apply on the Seed Fund portal') }
  ),
  group('Introduction', 'sisfs', {
    intro: rich(
      'Intro paragraph',
      '**SISFS (Startup India Seed Fund Scheme)** is a Government of India initiative to build a strong ecosystem for nurturing innovation and startups that drives sustainable economic growth and generates large-scale employment. AIC IIITK builds a startup ecosystem that bridges entrepreneurs and innovation from local to national and international markets.'
    ),
    'notes.0': text(
      'Note',
      'The scheme provides financial assistance to startups via a national corpus of ₹945 crore, disbursed through selected incubators across India in 2021-25.'
    ),
  }),
  cards('sisfs', [
    ['What the fund supports', ['Proof of concept', 'Prototype development', 'Product trials', 'Market entry', 'Commercialisation']],
    ['Programme flow', [
      'Startup application and eligibility review',
      'Screening, due diligence and selection by an expert committee',
      'Milestone-based support through mentoring and reviews',
      'Fund utilisation for validation, trials and commercialisation',
      'Periodic reporting and progress evaluation through the incubator',
    ]],
    ['Expected outcome', [
      'Early-stage startups move from concept to market-ready offerings',
      'Improved commercialisation pipeline through milestone support',
      'Job creation and sustainable, innovation-led growth',
      'Increased access to market and investor opportunities',
    ]],
    ['Eligibility criteria', [
      'A DPIIT-recognised startup incorporated less than 2 years before applying.',
      'A business idea with market fit, viable commercialisation and scope for scale.',
      'Uses technology in its core product, service or business model.',
      'Preference for social impact, waste / water management, edtech, agritech, healthcare, energy, robotics, etc.',
      'Has not received more than ₹10 lakh of monetary support under any other Central or State Government scheme.',
      'At least 51% shareholding by Indian promoters.',
    ]],
  ]),
  cta(
    'sisfs',
    'Ready to apply for the Seed Fund?',
    'Apply through the official Startup India portal and choose AIC IIIT Kottayam Foundation as your incubator.',
    'Go to Seed Fund portal'
  ),
];

const CAREERS = [
  hero(
    'careers',
    'Careers',
    'Work with AIC-IIITKottayam',
    'Help run the incubation centre, or intern with us and build real products alongside our startups.'
  ),
  group('Open positions', 'careers.positions', {
    title: line('Heading', 'Open positions'),
    ...each('Position', [
      ['Chief Executive Officer (CEO)', 'Full time', 'Lead the incubation centre, its programmes and its startup portfolio.'],
      ['Non-stipendiary internship', 'Internship · 2-3+ months', 'Open to MCA, MSc (Comp/IT), BE/BTech students and recent graduates.'],
    ].map(([title, type, summary]) => ({
      title: line('title', title),
      type: line('type', type),
      summary: text('summary', summary),
    }))),
    pdf: line('Details link', 'Position details (PDF)'),
    applyBy: line('Deadline label (before the date)', 'Apply by'),
    closed: line('Closed label', 'Closed'),
  }),
  group('Internship programme', 'careers.internship', {
    title: line('Heading', 'Internship programme'),
    note: text('Note', 'Interns should be available for at least 2 to 3 months, full time (Monday to Friday).'),
  }),
  cards('careers', [
    ['Objectives', [
      'Work on the day-to-day activities of the Atal Incubation Centre alongside real product development',
      'Hands-on development in Java, web / JavaScript frameworks, Python, machine learning, Android, IoT and blockchain',
    ]],
    ['Qualification & eligibility', [
      'Students doing final-semester projects: MCA / MSc (Comp/IT) / BE / BTech (CSE, IT, EEE, EC)',
      'Recent graduates passionate about innovation, technology and startup ecosystems',
    ]],
    ['Responsibilities & skills', [
      'Active product development across front-end, back-end, IoT and AI projects',
      'Good communication, fast learning, mentoring and technical documentation',
    ]],
    ['Perks & benefits', [
      'Official internship experience certificate from AIC-IIITKottayam',
      'Flexible working hours with hands-on exposure to live startup projects',
      'Networking with tech mentors and industry leaders',
    ]],
  ], 'Internship cards'),
  group('Call-out', 'careers.cta', {
    title: line('Title', 'Interested in joining or interning at AIC?'),
    text: text('Text', 'Send your resume to shajulin@iiitkottayam.ac.in and incubate@iiitkottayam.ac.in.'),
    button: line('Button', 'Email your resume'),
    emails: list('Button sends to (one email per line)', ['shajulin@iiitkottayam.ac.in', 'incubate@iiitkottayam.ac.in']),
  }),
];

const BOARD = [
  hero(
    'board',
    'Leadership',
    'Board of Governors',
    'Leading industrialists and academicians who guide the strategy and governance of AIC-IIITKottayam.'
  ),
  PEOPLE_TABS,
  group('List', 'board.list', {
    title: line('Heading', 'AIC-IIITKottayam Board of Governors'),
    empty: line('Shown when nobody is listed', 'No board members listed yet.'),
  }),
];

const TEAM = [
  hero('team', 'People & culture', 'The AIC-IIITKottayam team', 'The people who run the centre day to day and work alongside our startups.'),
  PEOPLE_TABS,
  group('List', 'team.list', {
    title: line('Heading', 'AIC-IIITKottayam Team'),
    empty: line('Shown when nobody is listed', 'No team members listed yet.'),
  }),
];

const MENTORS = [
  hero('mentor', 'Mentor network', 'Our mentors', 'Domain experts and seasoned founders, from India and abroad, who coach our startups.'),
  PEOPLE_TABS,
  group('Mentor groups', 'mentor.groups', each('Group', [
    ['International Mentors - Industry', 'No international industry mentors listed yet.'],
    ['International Mentors - Academic', 'No international academic mentors listed yet.'],
    ['India Mentors - Industry', 'No India industry mentors listed yet.'],
    ['India Mentors - Academic', 'No India academic mentors listed yet.'],
  ].map(([title, empty]) => ({ title: line('heading', title), empty: line('empty text', empty) })))),
];

const NEWS = [
  hero('news', 'Newsroom', 'News & updates', 'Announcements, events and milestones from AIC-IIITKottayam and our startups.'),
  NEWS_CARD,
  group('Article page', 'news.article', {
    back: line('Back link', 'Back to all news'),
    more: line('More news heading', 'More news'),
  }),
];

const GALLERY = [
  hero('gallery', 'Gallery', 'Moments from the centre', 'Workshops, hackathons, demo days and everyday life at AIC-IIITKottayam.'),
];

const NOT_FOUND = [
  hero('notFound', 'Error 404', 'We couldn’t find that page', 'The page may have moved, or the link may be out of date.', {
    home: line('Home button', 'Go to home page'),
    contact: line('Contact button', 'Contact us'),
  }),
];

export const PAGES = [
  { id: 'home', name: 'Home', path: '/', groups: HOME },
  { id: 'summary', name: 'Who we are', path: '/summary', groups: SUMMARY },
  { id: 'boardmember', name: 'Board of Governors', path: '/boardmember', groups: BOARD },
  { id: 'aicteam', name: 'Our Team', path: '/aicteam', groups: TEAM },
  { id: 'mentor', name: 'Mentors', path: '/mentor', groups: MENTORS },
  { id: 'sia', name: 'Pre-incubation (SIA)', path: '/sia', groups: SIA },
  { id: 'sisfs', name: 'Seed Fund (SISFS)', path: '/sisfs', groups: SISFS },
  { id: 'startup', name: 'Acceleration & portfolio', path: '/startup', groups: STARTUP },
  { id: 'news', name: 'News', path: '/news', groups: NEWS },
  { id: 'gallery', name: 'Gallery', path: '/gallery', groups: GALLERY },
  { id: 'careers', name: 'Careers', path: '/careers', groups: CAREERS },
  { id: 'notFound', name: 'Page not found', path: '/page-not-found', groups: NOT_FOUND },
];

/** Every field by key. */
export const FIELDS = Object.fromEntries(
  [...SHARED, ...PAGES.flatMap((p) => p.groups)].flatMap((g) => g.fields).map((f) => [f.key, f])
);

/** The page a website path belongs to (news articles count as the news page). */
export function pageForPath(pathname) {
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (path.startsWith('/news/')) return 'news';
  return PAGES.find((p) => p.path === path)?.id ?? 'notFound';
}
