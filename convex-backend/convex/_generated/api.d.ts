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
import type * as ai_agent from "../ai/agent.js";
import type * as ai_audit from "../ai/audit.js";
import type * as ai_chat from "../ai/chat.js";
import type * as ai_crypto from "../ai/crypto.js";
import type * as ai_diff from "../ai/diff.js";
import type * as ai_drafts from "../ai/drafts.js";
import type * as ai_flow from "../ai/flow.js";
import type * as ai_github from "../ai/github.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_preview from "../ai/preview.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_protected from "../ai/protected.js";
import type * as ai_publish from "../ai/publish.js";
import type * as ai_records from "../ai/records.js";
import type * as ai_repo from "../ai/repo.js";
import type * as ai_settings from "../ai/settings.js";
import type * as ai_tools from "../ai/tools.js";
import type * as ai_usage from "../ai/usage.js";
import type * as ai_versions from "../ai/versions.js";
import type * as auth from "../auth.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as gallery from "../gallery.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_validate from "../lib/validate.js";
import type * as migrate from "../migrate.js";
import type * as mux from "../mux.js";
import type * as news from "../news.js";
import type * as startups from "../startups.js";
import type * as team from "../team.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/agent": typeof ai_agent;
  "ai/audit": typeof ai_audit;
  "ai/chat": typeof ai_chat;
  "ai/crypto": typeof ai_crypto;
  "ai/diff": typeof ai_diff;
  "ai/drafts": typeof ai_drafts;
  "ai/flow": typeof ai_flow;
  "ai/github": typeof ai_github;
  "ai/models": typeof ai_models;
  "ai/preview": typeof ai_preview;
  "ai/prompts": typeof ai_prompts;
  "ai/protected": typeof ai_protected;
  "ai/publish": typeof ai_publish;
  "ai/records": typeof ai_records;
  "ai/repo": typeof ai_repo;
  "ai/settings": typeof ai_settings;
  "ai/tools": typeof ai_tools;
  "ai/usage": typeof ai_usage;
  "ai/versions": typeof ai_versions;
  auth: typeof auth;
  content: typeof content;
  crons: typeof crons;
  gallery: typeof gallery;
  http: typeof http;
  images: typeof images;
  "lib/access": typeof lib_access;
  "lib/validate": typeof lib_validate;
  migrate: typeof migrate;
  mux: typeof mux;
  news: typeof news;
  startups: typeof startups;
  team: typeof team;
  users: typeof users;
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

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
