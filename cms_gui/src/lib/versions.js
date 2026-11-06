import { Bot, Pencil, RotateCcw, XCircle } from 'lucide-react';

// Wording shared by the Versions pages.

export function formatDateTime(ms) {
  if (!ms) return '';
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}

export function timeAgo(ms) {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return formatDateTime(ms);
}

export const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

const quote = (text) => `“${text}”`;

const OP_VERB = { create: 'Added', update: 'Edited', delete: 'Deleted' };

/** Icon and colour for each kind of version. */
export function versionLook(version) {
  if (version.status === 'rejected') return { Icon: XCircle, tone: 'bg-muted text-muted-foreground', label: 'Rejected' };
  if (version.source === 'mcp') return { Icon: Bot, tone: 'bg-accent text-accent-foreground', label: 'AI change' };
  if (version.source === 'rollback') return { Icon: RotateCcw, tone: 'bg-warning/15 text-warning', label: 'Undo' };
  return { Icon: Pencil, tone: 'bg-secondary text-secondary-foreground', label: 'CMS edit' };
}

/** A one-line name for a version, e.g. Edited “WINQQR” or Undid the 6 Nov, 11:50 changes. */
export function versionTitle(version) {
  const items = version.items ?? [];
  const [first] = items;
  if (version.source === 'rollback') {
    const when = version.reverts ? formatDateTime(version.reverts.createdAt) : 'an earlier version';
    if (version.rollbackKind === 'restore') return `Restored the website to ${when}`;
    if (version.rollbackKind === 'revert' && items.length === 1 && first.fields.length === 1) {
      return `Put back ${first.fields[0].toLowerCase()} of ${quote(first.title)}`;
    }
    return `Undid changes from ${when}`;
  }
  if (version.source === 'mcp') {
    const app = version.app || 'an AI app';
    if (version.status === 'rejected') return `Rejected changes from ${app}`;
    if (version.status === 'pending') return `Changes proposed by ${app}`;
    return `Changes from ${app}`;
  }
  if (items.length === 1) return `${OP_VERB[first.op]} ${quote(first.title)}`;
  return `Changed ${plural(items.length, 'item')}`;
}

/** The second line: what was touched. */
export function versionSubtitle(version) {
  const items = version.items ?? [];
  if (items.length === 1) {
    const [only] = items;
    if (only.op !== 'update') return only.page;
    return `${only.page} · ${only.fields.join(', ')}`;
  }
  const names = items.slice(0, 3).map((i) => i.title);
  const more = items.length > 3 ? ` and ${items.length - 3} more` : '';
  return `${version.pages.join(', ')} · ${names.join(', ')}${more}`;
}

/** Groups a version's changes by the record they belong to, in order. */
export function groupByRecord(changes) {
  const groups = new Map();
  for (const change of changes) {
    const key = `${change.entity}:${change.recordId}`;
    if (!groups.has(key)) {
      groups.set(key, { key, entity: change.entity, page: change.page, noun: change.noun, itemTitle: change.itemTitle, changes: [] });
    }
    groups.get(key).changes.push(change);
  }
  return [...groups.values()];
}
