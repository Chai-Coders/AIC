// Pictures are served from the Convex /img/<id> route; ?w= asks for a copy
// resized to about that width, which is plenty for CMS previews.
export function resolveImageUrl(item, field, width = 960) {
  const raw = item?.[field];
  if (!raw || typeof raw !== 'string') return null;
  return /\/img\/[a-z0-9]{16,}$/.test(raw) ? `${raw}?w=${width}` : raw;
}
