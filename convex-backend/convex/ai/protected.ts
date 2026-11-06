// Which files the agent may touch. Enforced in the code tools and again when
// publishing, so a bad draft can't reach the branch even if a tool check is
// bypassed. The model can read protected files, but never edit them.

const EDITABLE_ROOTS = ["frontend/", "cms_gui/", "convex-backend/"];

// Reasons are shown to the model and the admin. Order doesn't matter.
const PROTECTED: { test: RegExp; reason: string }[] = [
  // Sign-in and the admin check. A bad edit locks the admin out of the page
  // used to roll back.
  { test: /^convex-backend\/convex\/lib\/access\.ts$/, reason: "the admin check" },
  { test: /^convex-backend\/convex\/auth(\.config)?\.ts$/, reason: "sign-in" },
  { test: /^convex-backend\/convex\/admin\.ts$/, reason: "admin accounts" },
  { test: /^convex-backend\/convex\/http\.ts$/, reason: "sign-in routes" },
  { test: /^convex-backend\/convex\/crons\.ts$/, reason: "scheduled jobs" },
  { test: /^cms_gui\/src\/main\.jsx$/, reason: "the CMS's startup" },
  { test: /^cms_gui\/index\.html$/, reason: "the CMS's startup" },
  { test: /^cms_gui\/src\/context\/AuthContext\.jsx$/, reason: "sign-in" },
  { test: /^cms_gui\/src\/components\/LoginPage\.jsx$/, reason: "sign-in" },
  { test: /^cms_gui\/src\/services\/convex\.js$/, reason: "the CMS connection" },
  // The agent itself, its limits and its tables.
  { test: /^convex-backend\/convex\/ai\//, reason: "the AI Assistant's own code" },
  { test: /^convex-backend\/convex\/schema\.ts$/, reason: "the database schema, which holds the AI settings and spend tables" },
  { test: /^convex-backend\/convex\/convex\.config\.ts$/, reason: "the AI Assistant's setup" },
  { test: /^cms_gui\/src\/components\/ai\//, reason: "the AI Assistant's own code" },
  { test: /^cms_gui\/src\/pages\/Ai[A-Za-z]*\.jsx$/, reason: "the AI Assistant's own code" },
  { test: /^cms_gui\/src\/preview\//, reason: "the AI Assistant's own code" },
  // Generated, and anything that runs on install or build.
  { test: /\/_generated\//, reason: "generated code" },
  { test: /(^|\/)package(-lock)?\.json$/, reason: "dependencies, which run code when installed" },
  { test: /(^|\/)((vite|vitest|postcss|tailwind|eslint|babel)\.config\.[a-z]+|\.postcssrc(\.[a-z]+)?|\.babelrc(\.[a-z]+)?|\.eslintrc(\.[a-z]+)?|vercel\.json|docker-compose\.yml|\.npmrc|tsconfig\.json)$/, reason: "build and deploy settings" },
  // frontend/scripts/snapshot.mjs runs on every website build.
  { test: /^[^/]+\/scripts\//, reason: "scripts that run on build or by hand" },
];

// Never sent to the model or cached, whatever the folder.
const SECRET = /(^|\/)(\.env($|\.)|.*\.(pem|key)$)/;

export const isSecretPath = (path: string) => SECRET.test(path) && !path.endsWith(".env.example");

/** Normalised repo-relative path, or null when it's outside the repo. */
export function cleanPath(path: string) {
  const clean = path.trim().replace(/^\.?\/+/, "");
  if (!clean || clean.includes("\\") || clean.split("/").some((part) => !part || part === ".." || part === ".")) return null;
  return clean;
}

export const inEditableRoot = (path: string) => EDITABLE_ROOTS.some((root) => path.startsWith(root));

/** Why the agent can't edit this path, or null when it can. */
export function editBlockedReason(path: string): string | null {
  if (!inEditableRoot(path)) return "only frontend/, cms_gui/ and convex-backend/ can be edited";
  if (isSecretPath(path)) return "it holds secrets";
  // Case-insensitive, so a checkout on a case-insensitive disk can't be tricked.
  return PROTECTED.find((rule) => new RegExp(rule.test.source, "i").test(path))?.reason ?? null;
}

/** Every file directly in convex/ can become a public API, so the agent can't add one. */
export const newFileBlockedReason = (path: string) =>
  /^convex-backend\/convex\//i.test(path) ? "a new backend file adds to the public API" : null;
