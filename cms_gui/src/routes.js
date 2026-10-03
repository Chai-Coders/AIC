import {
  Home,
  Image,
  Rocket,
  Newspaper,
  Users,
  Video,
} from 'lucide-react';

export const ROUTES = [
  {
    path: '/',
    id: 'home',
    name: 'Home',
    description: 'Overview & Main Logo Canvas',
    endpoint: null,
    icon: Home,
  },
  {
    path: '/gallery',
    id: 'gallery',
    name: 'Gallery Items',
    description: 'Image Showcase & Visual Assets',
    endpoint: '/api/gallery/',
    icon: Image,
  },
  {
    path: '/startups',
    id: 'startups',
    name: 'Startups',
    description: 'Incubated Ventures & Portfolios',
    endpoint: '/api/startups/',
    icon: Rocket,
  },
  {
    path: '/news',
    id: 'news',
    name: 'News Updates',
    description: 'Articles, Press & Announcements',
    endpoint: '/api/news/',
    icon: Newspaper,
  },
  {
    path: '/team',
    id: 'team',
    name: 'Team Members',
    description: 'Mentors, AIC Team & Governors',
    endpoint: '/api/team/',
    icon: Users,
  },
  {
    path: '/background-video',
    id: 'background-video',
    name: 'Background Video',
    description: 'Mux Video Stream & Upload',
    endpoint: '/api/backgroundvideo/',
    icon: Video,
  },
];
