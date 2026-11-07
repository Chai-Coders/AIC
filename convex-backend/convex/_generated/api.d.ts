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
import type * as ai_drafts from "../ai/drafts.js";
import type * as ai_flow from "../ai/flow.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_preview from "../ai/preview.js";
import type * as ai_priceSources from "../ai/priceSources.js";
import type * as ai_prices from "../ai/prices.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_records from "../ai/records.js";
import type * as ai_send from "../ai/send.js";
import type * as ai_settings from "../ai/settings.js";
import type * as ai_textFields from "../ai/textFields.js";
import type * as ai_tools from "../ai/tools.js";
import type * as ai_usage from "../ai/usage.js";
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
import type * as lib_siteText from "../lib/siteText.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_validate from "../lib/validate.js";
import type * as mcp from "../mcp.js";
import type * as migrate from "../migrate.js";
import type * as mux from "../mux.js";
import type * as news from "../news.js";
import type * as oauth from "../oauth.js";
import type * as siteText from "../siteText.js";
import type * as startups from "../startups.js";
import type * as team from "../team.js";
import type * as testCleanup from "../testCleanup.js";
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
  "ai/agent": typeof ai_agent;
  "ai/audit": typeof ai_audit;
  "ai/chat": typeof ai_chat;
  "ai/crypto": typeof ai_crypto;
  "ai/drafts": typeof ai_drafts;
  "ai/flow": typeof ai_flow;
  "ai/models": typeof ai_models;
  "ai/preview": typeof ai_preview;
  "ai/priceSources": typeof ai_priceSources;
  "ai/prices": typeof ai_prices;
  "ai/prompts": typeof ai_prompts;
  "ai/records": typeof ai_records;
  "ai/send": typeof ai_send;
  "ai/settings": typeof ai_settings;
  "ai/textFields": typeof ai_textFields;
  "ai/tools": typeof ai_tools;
  "ai/usage": typeof ai_usage;
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
  "lib/siteText": typeof lib_siteText;
  "lib/tokens": typeof lib_tokens;
  "lib/validate": typeof lib_validate;
  mcp: typeof mcp;
  migrate: typeof migrate;
  mux: typeof mux;
  news: typeof news;
  oauth: typeof oauth;
  siteText: typeof siteText;
  startups: typeof startups;
  team: typeof team;
  testCleanup: typeof testCleanup;
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

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
