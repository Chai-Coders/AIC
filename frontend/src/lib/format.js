const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "2026-03-14" -> "14 Mar 2026". Returns the input unchanged if it isn't a date. */
export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

/** Shortens text to roughly `max` characters on a word boundary. */
export function excerpt(text, max = 160) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', max) > 0 ? clean.lastIndexOf(' ', max) : max)}…`;
}

/** Hostname of a URL without "www.", for display. */
export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
