import { anyApi } from 'convex/server';
import { convex, run } from '../services/convex';

// Pictures are resized in the browser before upload: the website loads the
// smallest copy that looks sharp (see /img/ in convex-backend/convex/http.ts),
// and a 10 MB camera photo becomes a few hundred KB.
const WIDTHS = [480, 960, 1920];
const WEBP_QUALITY = 0.8;

async function resize(bitmap, width) {
  const height = Math.round((bitmap.height * width) / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  // Browsers that can't encode WebP fall back to PNG, which the server accepts.
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob) throw new Error('Could not process that picture. Please try a different file.');
  return { blob, width, height };
}

async function store(blob) {
  const uploadUrl = await run(() => convex.mutation(anyApi.images.generateUploadUrl, {}));
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
  if (!res.ok) throw new Error('The picture could not be uploaded. Please try again.');
  return (await res.json()).storageId;
}

/** Uploads a picture as resized copies; returns its id to save on a record. */
export async function uploadImage(file) {
  let bitmap;
  try {
    // Applies the EXIF rotation of phone and camera photos.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That picture could not be read. Please choose a JPG, PNG or WEBP file.');
  }
  try {
    const widths = [...new Set(WIDTHS.map((w) => Math.min(w, bitmap.width)))];
    const copies = await Promise.all(widths.map((w) => resize(bitmap, w)));
    const variants = await Promise.all(
      copies.map(async ({ blob, width }) => ({ width, storageId: await store(blob) }))
    );
    const largest = copies[copies.length - 1];
    return await run(() =>
      convex.mutation(anyApi.images.create, { variants, width: largest.width, height: largest.height })
    );
  } finally {
    bitmap.close();
  }
}
