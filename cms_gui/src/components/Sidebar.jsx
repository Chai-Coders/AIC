import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Image,
  Rocket,
  Newspaper,
  Users,
  Video,
  ChevronRight,
  Database,
  Terminal,
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

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-25 h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shadow-lg md:shadow-none ${
          isOpen ? 'w-64 sm:w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Section Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/70">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>CMS Endpoints</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-accent-foreground">
              v1.0
            </span>
          </div>

          {/* Navigation Route Rows */}
          <nav className="space-y-1.5">
            {ROUTES.map((route) => {
              const Icon = route.icon;

              return (
                <NavLink
                  key={route.path}
                  to={route.path}
                  end={route.path === '/'}
                  className={({ isActive }) =>
                    `w-full group text-left px-3.5 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-primary/15 border-primary/40 text-foreground shadow-xs font-semibold'
                        : 'border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-sidebar-accent text-sidebar-foreground group-hover:bg-primary/20 group-hover:text-primary'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">
                              {route.name}
                            </span>
                          </div>
                          {route.endpoint ? (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground group-hover:text-primary/90 transition-colors truncate">
                              <Terminal className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{route.endpoint}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground truncate block">
                              Main dashboard
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive
                            ? 'text-primary translate-x-0.5'
                            : 'text-muted-foreground/50 opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

      </aside>
    </>
  );
}
