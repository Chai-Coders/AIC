// The parts of each page, in order, that new sections can go after. They match the
// children of <PageSections> on that page: PageLayout's hero, then the page's own
// sections, or on the home page HomePage's list. Ids are permanent, since saved
// sections refer to them; a section whose place is gone shows at the end of its page.
//
// This is plain data: the backend bundles it too (convex-backend/convex/ai/textFields.ts).

const hero = { id: 'hero', label: 'Page title' };
const tabs = { id: 'tabs', label: 'People tabs' };

export const SECTION_MAP = {
  '/': [
    { id: 'hero', label: 'Big banner at the top' },
    { id: 'about', label: 'About' },
    { id: 'programs', label: 'Programmes' },
    { id: 'services', label: 'What we offer' },
    { id: 'startups', label: 'Startup logos' },
    { id: 'features', label: 'Our approach' },
    { id: 'pricing', label: 'Plans' },
    { id: 'news', label: 'News' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'contact', label: 'Contact' },
  ],
  '/summary': [hero, { id: 'story', label: 'Our story' }, { id: 'pillars', label: 'What we stand for' }, { id: 'cards', label: 'Vision and host institute' }, { id: 'cta', label: 'Call to action' }],
  '/boardmember': [hero, tabs, { id: 'people', label: 'Board members' }],
  '/aicteam': [hero, tabs, { id: 'people', label: 'Team members' }],
  '/mentor': [
    hero,
    tabs,
    { id: 'intl-industry', label: 'International mentors: industry' },
    { id: 'intl-academic', label: 'International mentors: academic' },
    { id: 'india-industry', label: 'India mentors: industry' },
    { id: 'india-academic', label: 'India mentors: academic' },
  ],
  '/sia': [hero, { id: 'programme', label: 'Programme details' }],
  '/sisfs': [hero, { id: 'programme', label: 'Programme details' }],
  '/startup': [hero, { id: 'programme', label: 'Programme details' }, { id: 'portfolio', label: 'Startup portfolio' }, { id: 'partners', label: 'Partners' }],
  '/news': [hero, { id: 'list', label: 'News list' }],
  '/gallery': [hero, { id: 'photos', label: 'Photos' }],
  '/careers': [hero, { id: 'positions', label: 'Open positions' }, { id: 'internships', label: 'Internships' }],
};

export const normalizePagePath = (pathname) => pathname.replace(/\/+$/, '').toLowerCase() || '/';
