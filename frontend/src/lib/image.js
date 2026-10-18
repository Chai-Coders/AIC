// Pictures are served by the Convex backend at /img/<id> (a Convex document
// id), which stores a few resized WebP copies of each upload (480, 960 and
// 1920 px wide). Adding ?w=<width> returns the smallest copy at least that
// wide, so pages never download a bigger file than they display. Other URLs
// are returned unchanged.

function isResizable(url) {
  return typeof url === 'string' && /\/img\/[a-z0-9]{16,}$/.test(url);
}

/**
 * @param {string} url - Image URL from the API
 * @param {number} width - Largest width (in CSS pixels x density) that will be displayed
 * @returns {string}
 */
export function cdnImage(url, width) {
  if (!isResizable(url)) return url;
  return `${url}?w=${width}`;
}

/**
 * Props for a responsive <img>: the browser picks the smallest copy that is
 * sharp enough for the slot size described by `sizes`.
 *
 * @param {string} url
 * @param {number[]} widths - Candidate widths, smallest first
 * @param {string} sizes - Standard `sizes` attribute describing the display width
 */
export function cdnImageProps(url, widths, sizes) {
  if (!isResizable(url)) return { src: url };
  return {
    src: cdnImage(url, widths[widths.length - 1]),
    srcSet: widths.map((w) => `${cdnImage(url, w)} ${w}w`).join(', '),
    sizes,
  };
}

/**
 * onLoad handler: very wide images (logos, banners) are shown whole instead of
 * cropped by object-fit: cover.
 */
export function fitWideImage(event) {
  const img = event.currentTarget;
  if (img.naturalHeight && img.naturalWidth / img.naturalHeight > 2) img.classList.add('is-contain');
}
