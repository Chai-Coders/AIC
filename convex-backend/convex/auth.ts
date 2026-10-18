import { ConvexError } from "convex/values";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Only signing in is allowed from the CMS. Admin accounts are created and
      // their passwords changed from the command line (see admin.ts), so there
      // is no public sign-up and no email-based password reset.
      profile(params) {
        if (params.flow !== "signIn") {
          throw new ConvexError("Accounts are created by the site administrator.");
        }
        return { email: normalizeEmail(params.email) };
      },
    }),
  ],
});

export function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}
