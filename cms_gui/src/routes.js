import {
  LayoutDashboard,
  Image,
  Rocket,
  Newspaper,
  Users,
  Video,
} from 'lucide-react';

// Public website address, shown as a "View website" link when configured.
export const SITE_URL = import.meta.env.VITE_SITE_URL || '';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

export const TEAM_CATEGORIES = [
  { value: 'team', label: 'AIC Team' },
  { value: 'mentor', label: 'International Mentors' },
  { value: 'governor', label: 'Board of Governors' },
];

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
    ],
    summarize: (item) => ({
      title: item.name || 'Unnamed member',
      subtitle: item.role,
      tag: item.category_display || TEAM_CATEGORIES.find((c) => c.value === item.category)?.label,
    }),
  },
};

export const ROUTES = [
  { path: '/', id: 'home', name: 'Overview', icon: LayoutDashboard },
  ...['gallery', 'startups', 'news', 'team'].map((id) => SECTIONS[id]),
  { path: '/background-video', id: 'background-video', name: 'Homepage video', icon: Video },
];
