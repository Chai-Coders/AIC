import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";

// Every account is a CMS admin (there is no public sign-up), so being signed in
// is enough to edit the site.
export async function requireAdmin(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Your session has expired. Please sign in again.");
  }
  return userId;
}
