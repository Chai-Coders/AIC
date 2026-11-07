// The CMS's "Site text" page shows this website in a frame with ?cms-edit=1,
// and the two talk with postMessage (see CmsBridge.jsx). Edit mode only turns
// on inside a frame, and messages are only exchanged with the CMS's address.

function cmsOrigin() {
  const url = import.meta.env.VITE_CMS_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '');
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

export const CMS_ORIGIN = cmsOrigin();

// Read once at startup: in-app links drop the query string.
export const EDIT_MODE =
  typeof window !== 'undefined' &&
  window.parent !== window &&
  CMS_ORIGIN !== null &&
  new URLSearchParams(window.location.search).has('cms-edit');

// The CMS's AI Assistant shows the site with ?cms-edit=1&cms-agent=1: the admin
// browses normally and sees the agent's draft (see AgentBridge.jsx).
export const AGENT_MODE = EDIT_MODE && new URLSearchParams(window.location.search).has('cms-agent');
