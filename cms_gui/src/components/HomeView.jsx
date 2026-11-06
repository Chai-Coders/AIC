import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, ExternalLink, Plus, Type, Video } from 'lucide-react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SECTIONS, SITE_URL } from '../routes';

const SECTION_IDS = ['news', 'startups', 'team', 'gallery'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeView() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});
  const [video, setVideo] = useState(undefined);
  const pendingCount = useQuery(anyApi.drafts.pendingCount) ?? 0;

  useEffect(() => {
    let cancelled = false;
    SECTION_IDS.forEach((id) => {
      api.endpoints[id]
        .count()
        .then((n) => !cancelled && setCounts((prev) => ({ ...prev, [id]: n })))
        .catch(() => !cancelled && setCounts((prev) => ({ ...prev, [id]: null })));
    });
    api.endpoints.backgroundVideo
      .get()
      .then((data) => !cancelled && setVideo(data))
      .catch(() => !cancelled && setVideo(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const hasVideo = Boolean(video?.id && video?.video_url);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting()}
            {user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose what you’d like to update. Changes go live on the website as soon as you save them.
          </p>
        </div>
        {SITE_URL && (
          <a href={SITE_URL} target="_blank" rel="noreferrer" className="btn-secondary self-start sm:self-auto">
            <ExternalLink className="h-4 w-4" />
            <span>View website</span>
          </a>
        )}
      </div>

      {pendingCount > 0 && (
        <Link
          to="/versions?tab=pending"
          className="flex items-center gap-4 rounded-xl border border-primary/30 bg-accent p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              {pendingCount} AI {pendingCount === 1 ? 'change is' : 'changes are'} waiting for your approval
            </h2>
            <p className="text-sm text-muted-foreground">Check them before they go on the website.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTION_IDS.map((id) => {
          const section = SECTIONS[id];
          const Icon = section.icon;
          const count = counts[id];
          return (
            <div key={id} className="flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-base font-semibold text-foreground">{section.name}</h2>
                  <p className="text-sm font-medium text-accent-foreground">
                    {count === undefined ? (
                      <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted align-middle" />
                    ) : count === null ? (
                      '\u00a0'
                    ) : (
                      `${count} ${section.noun}${count === 1 ? '' : 's'} on the website`
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Link to={section.path} className="btn-secondary flex-1">
                  <span>Manage</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to={section.path} state={{ addNew: true }} className="btn-ghost">
                  <Plus className="h-4 w-4" />
                  <span>Add {section.noun}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/site-text"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Type className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Site text</h2>
          <p className="truncate text-sm text-muted-foreground">
            Headings, paragraphs, buttons and contact details on every page, edited next to a live preview.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>

      <Link
        to="/background-video"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Video className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Homepage video</h2>
          <p className="truncate text-sm text-muted-foreground">
            {video === undefined
              ? 'Checking…'
              : hasVideo
              ? `Now playing: ${video.video_name}`
              : 'No video set yet. Upload one to show it on the homepage.'}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
