// Convex validates the JWTs that Convex Auth (auth.ts) issues. On a
// self-hosted backend CONVEX_SITE_URL is the public CONVEX_SITE_ORIGIN.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
