import { ConvexError, v } from "convex/values";
import { internalAction } from "./_generated/server";
import { createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { normalizeEmail } from "./auth";

// CMS admin accounts are managed from the command line only, e.g.
//   npx convex run admin:createAdmin '{"email":"ceo-aic@iiitkottayam.ac.in","password":"…","name":"Kiran"}'
//   npx convex run admin:setPassword '{"email":"…","password":"…"}'
// To remove an admin, delete their row in the `users` table from the dashboard.

const MIN_PASSWORD_LENGTH = 10;

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ConvexError(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export const createAdmin = internalAction({
  args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { email, password, name }) => {
    checkPassword(password);
    const id = normalizeEmail(email);
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id, secret: password },
      profile: { email: id, ...(name ? { name } : {}) },
    });
    return `Created admin ${id} (${user._id}).`;
  },
});

export const setPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    checkPassword(password);
    const id = normalizeEmail(email);
    await modifyAccountCredentials(ctx, { provider: "password", account: { id, secret: password } });
    return `Password changed for ${id}.`;
  },
});
