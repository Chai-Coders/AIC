// Cloudinary serves the original upload (often several MB) unless the URL asks
// for a transformation. These helpers request a resized, auto-compressed copy
// in the best format the browser supports (AVIF/WebP), which is typically
// 50-200x smaller. Non-Cloudinary URLs are returned unchanged.

const UPLOAD_SEGMENT = '/image/upload/';

function isCloudinary(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes(UPLOAD_SEGMENT);
}

/**
 * @param {string} url - Image URL from the API
 * @param {number} width - Largest width (in CSS pixels x density) that will be displayed
 * @returns {string}
 */
export function cdnImage(url, width) {
  if (!isCloudinary(url)) return url;
  // c_limit only ever shrinks, so small originals are never upscaled.
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}f_auto,q_auto,c_limit,w_${width}/`);
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
  if (!isCloudinary(url)) return { src: url };
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
