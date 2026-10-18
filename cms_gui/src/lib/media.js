// Records store image paths as absolute URLs (Cloudinary) or media-relative paths.
export function resolveImageUrl(item, field) {
  const raw = item?.[field];
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
  return `/${raw}`;
}
