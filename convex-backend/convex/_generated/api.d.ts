/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as gallery from "../gallery.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_history from "../lib/history.js";
import type * as lib_registry from "../lib/registry.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_validate from "../lib/validate.js";
import type * as mcp from "../mcp.js";
import type * as migrate from "../migrate.js";
import type * as mux from "../mux.js";
import type * as news from "../news.js";
import type * as oauth from "../oauth.js";
import type * as startups from "../startups.js";
import type * as team from "../team.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as versions from "../versions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  content: typeof content;
  crons: typeof crons;
  drafts: typeof drafts;
  gallery: typeof gallery;
  http: typeof http;
  images: typeof images;
  "lib/access": typeof lib_access;
  "lib/history": typeof lib_history;
  "lib/registry": typeof lib_registry;
  "lib/tokens": typeof lib_tokens;
  "lib/validate": typeof lib_validate;
  mcp: typeof mcp;
  migrate: typeof migrate;
  mux: typeof mux;
  news: typeof news;
  oauth: typeof oauth;
  startups: typeof startups;
  team: typeof team;
  uploads: typeof uploads;
  users: typeof users;
  versions: typeof versions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
