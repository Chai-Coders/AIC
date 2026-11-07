import {
  History,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Image,
  Rocket,
  Newspaper,
  Users,
  Video,
  Bot,
  Type,
} from 'lucide-react';

// Public website address, shown as a "View website" link when configured.
export const SITE_URL = import.meta.env.VITE_SITE_URL || '';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

// Must match `teamCategory` in convex-backend/convex/schema.ts. Mentors are
// split into the four groups the website's mentors page shows as tabs.
export const TEAM_CATEGORIES = [
  { value: 'team', label: 'AIC Team' },
  { value: 'governor', label: 'Board of Governors' },
  { value: 'mentor_intl_industry', label: 'International Mentors - Industry' },
  { value: 'mentor_intl_academic', label: 'International Mentors - Academic' },
  { value: 'mentor_india_industry', label: 'India Mentors - Industry' },
  { value: 'mentor_india_academic', label: 'India Mentors - Academic' },
];

// Describes the picture for people using screen readers (stored as `altText`).
const ALT_TEXT_FIELD = {
  name: 'alt_text',
  label: 'Alt text',
  type: 'text',
  maxLength: 300,
  placeholder: 'e.g. Founders presenting to the jury on Demo Day',
  help: 'Optional. Describes the picture for people who can\'t see it.',
};

// Everything the UI needs to know about each editable section of the website:
// how it is labelled, which form fields it has and how its items are summarised
// on a card. `id` matches the keys of api.endpoints.
export const SECTIONS = {
  gallery: {
    id: 'gallery',
    path: '/gallery',
    name: 'Gallery',
    noun: 'photo',
    description: 'Photos shown in the gallery on the website.',
    icon: Image,
    layout: 'tiles',
    imageField: 'image',
    imageLabel: 'Photo',
    imageFit: 'cover',
    fields: [
      {
        name: 'subtext',
        label: 'Caption',
        type: 'text',
        maxLength: 255,
        placeholder: 'e.g. Demo Day 2026 at the main hall',
        help: 'Optional. A short line shown with the photo.',
      },
      ALT_TEXT_FIELD,
    ],
    summarize: (item) => ({
      title: item.subtext || 'Untitled photo',
      meta: formatDate(item.created_at),
    }),
  },
  startups: {
    id: 'startups',
    path: '/startups',
    name: 'Startups',
    noun: 'startup',
    description: 'Startups listed on the website, with their logo and a short description.',
    icon: Rocket,
    layout: 'rows',
    imageField: 'logo_or_image',
    imageLabel: 'Logo',
    imageFit: 'contain',
    fields: [
      { name: 'name', label: 'Startup name', type: 'text', required: true, maxLength: 200, placeholder: 'e.g. EcoCool Thermal' },
      {
        name: 'website_url',
        label: 'Website',
        type: 'url',
        placeholder: 'https://example.com',
        help: 'Optional. Must start with https://',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 4,
        required: true,
        placeholder: 'What does the startup do?',
      },
      ALT_TEXT_FIELD,
    ],
    summarize: (item) => ({
      title: item.name || 'Unnamed startup',
      subtitle: item.description,
      link: item.website_url,
    }),
  },
  news: {
    id: 'news',
    path: '/news',
    name: 'News',
    noun: 'news article',
    description: 'News and announcements shown on the website.',
    icon: Newspaper,
    layout: 'rows',
    imageField: 'thumbnail',
    imageLabel: 'Cover image',
    imageFit: 'cover',
    fields: [
      { name: 'title', label: 'Headline', type: 'text', required: true, maxLength: 255, placeholder: 'e.g. National Hackathon 2026 announced' },
      {
        name: 'subtitle',
        label: 'Summary',
        type: 'text',
        maxLength: 300,
        placeholder: 'One sentence that sums up the article',
        help: 'Optional. Shown under the headline.',
      },
      {
        name: 'content',
        label: 'Article',
        type: 'textarea',
        rows: 10,
        required: true,
        placeholder: 'Write the full article here…',
      },
      ALT_TEXT_FIELD,
    ],
    summarize: (item) => ({
      title: item.title || 'Untitled article',
      subtitle: item.subtitle || item.content,
      meta: formatDate(item.published_date),
    }),
  },
  team: {
    id: 'team',
    path: '/team',
    name: 'Team',
    noun: 'team member',
    description: 'People shown on the team page: the AIC team, mentors and governors.',
    icon: Users,
    layout: 'tiles',
    imageField: 'photo',
    imageLabel: 'Photo',
    imageFit: 'cover',
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true, maxLength: 150, placeholder: 'e.g. Dr. Jane Doe' },
      { name: 'role', label: 'Job title', type: 'text', required: true, maxLength: 150, placeholder: 'e.g. Chief Executive Officer' },
      {
        name: 'category',
        label: 'Group',
        type: 'select',
        required: true,
        options: TEAM_CATEGORIES,
        defaultValue: 'team',
        help: 'Which group this person appears under on the website.',
      },
      { name: 'bio', label: 'Short bio', type: 'textarea', rows: 4, placeholder: 'Optional. A few lines about this person.' },
      ALT_TEXT_FIELD,
    ],
    summarize: (item) => ({
      title: item.name || 'Unnamed member',
      subtitle: item.role,
      tag: item.category_display || TEAM_CATEGORIES.find((c) => c.value === item.category)?.label,
    }),
  },
};

export const ROUTES = [
  { path: '/ai', id: 'ai', name: 'AI Assistant', icon: Sparkles, fullBleed: true },
  { path: '/', id: 'home', name: 'Overview', icon: LayoutDashboard },
  // Fills the whole window instead of the usual centred column (see DashboardLayout).
  { path: '/site-text', id: 'site-text', name: 'Site text', icon: Type, fullBleed: true },
  ...['gallery', 'startups', 'news', 'team'].map((id) => SECTIONS[id]),
  { path: '/background-video', id: 'background-video', name: 'Homepage video', icon: Video },
  { path: '/versions', id: 'versions', name: 'Versions', icon: History },
  { path: '/ai/settings', id: 'ai-settings', name: 'AI settings', icon: Settings2 },
  { path: '/ai-connection', id: 'ai-connection', name: 'AI connection', icon: Bot },
];
