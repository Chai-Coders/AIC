// One-time copy of all website content from the old Django API into Convex.
//
// Reads every record from the Django REST API, downloads each picture
// (from Cloudinary), stores resized WebP copies in Convex file storage and
// inserts the records. Safe to re-run: rows are matched on their Django id
// (`legacyId`) and updated in place.
//
//   DJANGO_API_BASE=https://old-backend.example.com/api node scripts/migrate-from-django.mjs
//
// Writes go to CONVEX_SELF_HOSTED_URL with CONVEX_SELF_HOSTED_ADMIN_KEY, or to
// the local dev deployment in .env.local when those are not set.

import { readFile } from 'node:fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import sharp from 'sharp';

const api = anyApi;
// Copies made of every picture. The largest is capped at the original's width.
const WIDTHS = [480, 960, 1920];
const WEBP_QUALITY = 80;
const CONCURRENCY = 4;

const DJANGO_API_BASE = (process.env.DJANGO_API_BASE || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

async function convexTarget() {
  if (process.env.CONVEX_SELF_HOSTED_URL && process.env.CONVEX_SELF_HOSTED_ADMIN_KEY) {
    return { url: process.env.CONVEX_SELF_HOSTED_URL, adminKey: process.env.CONVEX_SELF_HOSTED_ADMIN_KEY };
  }
  // Local deployment started by `npx convex dev`.
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
  const url = env.match(/^CONVEX_URL=(.+)$/m)?.[1]?.trim();
  const config = JSON.parse(await readFile(new URL('../.convex/local/default/config.json', import.meta.url), 'utf8'));
  if (!url || !config.adminKey) throw new Error('Set CONVEX_SELF_HOSTED_URL and CONVEX_SELF_HOSTED_ADMIN_KEY.');
  return { url, adminKey: config.adminKey };
}

const { url: convexUrl, adminKey } = await convexTarget();
const convex = new ConvexHttpClient(convexUrl);
convex.setAdminAuth(adminKey);

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

/** Every record of a paginated DRF list endpoint. */
async function listAll(path) {
  const items = [];
  let next = `${DJANGO_API_BASE}${path}?page_size=100`;
  while (next) {
    const page = await getJson(next);
    if (Array.isArray(page)) return page;
    items.push(...page.results);
    next = page.next;
  }
  return items;
}

/** Downloads a picture, stores its resized copies and returns the images id. */
async function importImage(sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Download of ${sourceUrl} failed: ${res.status}`);
  const original = Buffer.from(await res.arrayBuffer());
  // rotate() applies the EXIF orientation from phone/camera photos.
  const { width: originalWidth } = await sharp(original).rotate().metadata();

  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, originalWidth)))];
  const variants = [];
  let largest;
  for (const width of widths) {
    const { data, info } = await sharp(original)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const uploadUrl = await convex.mutation(api.migrate.generateUploadUrl, {});
    const upload = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: data });
    if (!upload.ok) throw new Error(`Upload failed: ${upload.status}`);
    const { storageId } = await upload.json();
    variants.push({ width: info.width, storageId });
    largest = info;
  }
  return await convex.mutation(api.migrate.createImage, { variants, width: largest.width, height: largest.height });
}

const ms = (iso) => (iso ? Date.parse(iso) : Date.now());

// Django has a single "mentor" category; the old site kept the mentor's group
// in the bio instead. Convex has one category per group (see schema.ts).
const MENTOR_GROUPS = {
  'international mentors - industry': 'mentor_intl_industry',
  'international mentors - academic': 'mentor_intl_academic',
  'india mentors - industry': 'mentor_india_industry',
  'india mentors - academic': 'mentor_india_academic',
  'indian mentors - academic': 'mentor_india_academic',
};

/** Convex category and bio for a Django team member. */
function teamCategory(r) {
  if (r.category !== 'mentor') return { category: r.category, bio: r.bio ?? '' };
  const bio = (r.bio ?? '').trim();
  const category = MENTOR_GROUPS[bio.toLowerCase()];
  if (!category) {
    throw new Error(`can't tell which mentor group "${r.name}" belongs to (bio: "${bio}")`);
  }
  // The bio only named the group, which the category now records.
  return { category, bio: '' };
}

// How each Django record becomes a Convex row: [table, image field, fields].
const SECTIONS = {
  gallery: {
    path: '/gallery/',
    table: 'gallery',
    image: (r) => r.image,
    doc: (r, imageId) => ({ imageId, subtext: r.subtext ?? '', createdAt: ms(r.created_at) }),
  },
  startups: {
    path: '/startups/',
    table: 'startups',
    image: (r) => r.logo_or_image,
    doc: (r, logoId) => ({
      name: r.name,
      description: r.description ?? '',
      logoId,
      ...(r.website_url ? { websiteUrl: r.website_url } : {}),
      createdAt: ms(r.created_at),
    }),
  },
  news: {
    path: '/news/',
    table: 'news',
    image: (r) => r.thumbnail,
    doc: (r, thumbnailId) => ({
      title: r.title,
      subtitle: r.subtitle ?? '',
      content: r.content,
      thumbnailId,
      publishedDate: r.published_date,
    }),
  },
  team: {
    path: '/team/',
    table: 'teamMembers',
    image: (r) => r.photo,
    doc: (r, photoId) => ({
      name: r.name,
      role: r.role,
      ...teamCategory(r),
      ...(photoId ? { photoId } : {}),
      createdAt: ms(r.created_at),
    }),
  },
};

/** Runs `fn` over `items` with at most CONCURRENCY in flight. */
async function eachLimited(items, fn) {
  let index = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (index < items.length) await fn(items[index++]);
  });
  await Promise.all(workers);
}

const failures = [];
const expected = {};

for (const [name, section] of Object.entries(SECTIONS)) {
  const records = await listAll(section.path);
  expected[name] = records.length;
  const counts = { created: 0, updated: 0 };
  await eachLimited(records, async (record) => {
    try {
      const source = section.image(record);
      const imageId = source ? await importImage(source) : undefined;
      const result = await convex.mutation(api.migrate.upsert, {
        legacyId: record.id,
        record: { table: section.table, doc: section.doc(record, imageId) },
      });
      counts[result]++;
    } catch (err) {
      failures.push(`${name} #${record.id}: ${err.message}`);
    }
  });
  console.log(`${name}: ${records.length} in Django, ${counts.created} created, ${counts.updated} updated`);
}

const video = await getJson(`${DJANGO_API_BASE}/backgroundvideo/`);
if (video?.video_url) {
  await convex.mutation(api.migrate.setBackgroundVideo, {
    videoName: video.video_name,
    videoUrl: video.video_url,
    ...(video.thumbnail_url ? { thumbnailUrl: video.thumbnail_url } : {}),
    ...(video.mux_asset_id ? { muxAssetId: video.mux_asset_id } : {}),
    ...(video.mux_playback_id ? { muxPlaybackId: video.mux_playback_id } : {}),
    createdAt: ms(video.created_at),
    updatedAt: ms(video.updated_at),
  });
  console.log(`background video: ${video.video_name}`);
}

// Compare against what the website will now read.
const site = await convex.query(api.content.siteContent, {});
const mismatches = Object.entries(expected).filter(([name, n]) => site[name].length !== n);
for (const [name, n] of mismatches) console.error(`MISMATCH ${name}: Django ${n}, Convex ${site[name].length}`);
for (const failure of failures) console.error(`FAILED ${failure}`);

if (failures.length || mismatches.length) process.exit(1);
console.log('Migration complete: all counts match.');
