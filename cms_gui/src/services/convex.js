import { ConvexReactClient } from 'convex/react';
import { ConvexError } from 'convex/values';

// The CMS talks to the Convex backend (see convex-backend/). Admin sessions
// are handled by Convex Auth through this client (see main.jsx).
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

/** Runs a backend call, turning its errors into messages for the editor. */
export async function run(call) {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ConvexError) throw new Error(String(err.data), { cause: err });
    console.error(err);
    throw new Error('Something went wrong on the server. Please try again in a moment.', { cause: err });
  }
}
