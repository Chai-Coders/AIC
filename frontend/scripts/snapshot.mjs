// Saves the API's site content into src/data/snapshot.json before a build, so
// first-time visitors see content instantly (src/api/cache.js uses it as the
// oldest fallback and refreshes it straight away). Runs as `prebuild`.
//
// Never fails the build: if the API can't be reached, the site simply builds
// without a snapshot and loads everything from the API as before.

import { writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const OUTPUT = new URL('../src/data/snapshot.json', import.meta.url);
// A sleeping Render instance can take close to a minute to answer.
const TIMEOUT_MS = 90_000;

const env = loadEnv('production', process.cwd(), '');
const base = (env.SNAPSHOT_API_BASE || env.VITE_API_BASE || '').replace(/\/+$/, '');

async function main() {
  if (!/^https?:\/\//.test(base)) {
    console.warn('[snapshot] Skipped: set VITE_API_BASE (or SNAPSHOT_API_BASE) to the full backend URL.');
    return;
  }

  try {
    const res = await fetch(`${base}/site-content/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    await writeFile(OUTPUT, JSON.stringify({ site: { data, time: Date.now() } }));
    const counts = ['gallery', 'startups', 'news', 'team'].map((k) => `${data[k]?.length ?? 0} ${k}`);
    console.log(`[snapshot] Saved ${counts.join(', ')}.`);
  } catch (err) {
    console.warn(`[snapshot] Skipped: could not load ${base}/site-content/ (${err.message}).`);
  }
}

await main();
