// The website source bundled into the CMS at build time, read from ../frontend.
// Used when the backend has no cached copy of the repo (no GitHub token set),
// and by the Phase 0 prototype page. Keys are paths relative to frontend/.
const modules = import.meta.glob(['../../../frontend/src/**/*.{js,jsx,css,json,svg}', '../../../frontend/package.json'], {
  query: '?raw',
  import: 'default',
});

const PREFIX = '../../../frontend/';

export async function loadLocalSources() {
  const entries = await Promise.all(
    Object.entries(modules).map(async ([path, load]) => [path.slice(PREFIX.length), await load()]),
  );
  return Object.fromEntries(entries);
}
