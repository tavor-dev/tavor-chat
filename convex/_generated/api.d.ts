/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as app from "../app.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chat_engine_client_createTool from "../chat_engine/client/createTool.js";
import type * as chat_engine_client_files from "../chat_engine/client/files.js";
import type * as chat_engine_client_index from "../chat_engine/client/index.js";
import type * as chat_engine_client_streaming from "../chat_engine/client/streaming.js";
import type * as chat_engine_client_types from "../chat_engine/client/types.js";
import type * as chat_engine_files from "../chat_engine/files.js";
import type * as chat_engine_mapping from "../chat_engine/mapping.js";
import type * as chat_engine_messages from "../chat_engine/messages.js";
import type * as chat_engine_shared from "../chat_engine/shared.js";
import type * as chat_engine_streams from "../chat_engine/streams.js";
import type * as chat_engine_threads from "../chat_engine/threads.js";
import type * as chat_engine_users from "../chat_engine/users.js";
import type * as chat_engine_validators from "../chat_engine/validators.js";
import type * as chat_engine_vector_index from "../chat_engine/vector/index.js";
import type * as chat_engine_vector_tables from "../chat_engine/vector/tables.js";
import type * as email_index from "../email/index.js";
import type * as email_templates_subscriptionEmail from "../email/templates/subscriptionEmail.js";
import type * as env from "../env.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as messages from "../messages.js";
import type * as stripe from "../stripe.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  account: typeof account;
  app: typeof app;
  auth: typeof auth;
  chat: typeof chat;
  "chat_engine/client/createTool": typeof chat_engine_client_createTool;
  "chat_engine/client/files": typeof chat_engine_client_files;
  "chat_engine/client/index": typeof chat_engine_client_index;
  "chat_engine/client/streaming": typeof chat_engine_client_streaming;
  "chat_engine/client/types": typeof chat_engine_client_types;
  "chat_engine/files": typeof chat_engine_files;
  "chat_engine/mapping": typeof chat_engine_mapping;
  "chat_engine/messages": typeof chat_engine_messages;
  "chat_engine/shared": typeof chat_engine_shared;
  "chat_engine/streams": typeof chat_engine_streams;
  "chat_engine/threads": typeof chat_engine_threads;
  "chat_engine/users": typeof chat_engine_users;
  "chat_engine/validators": typeof chat_engine_validators;
  "chat_engine/vector/index": typeof chat_engine_vector_index;
  "chat_engine/vector/tables": typeof chat_engine_vector_tables;
  "email/index": typeof email_index;
  "email/templates/subscriptionEmail": typeof email_templates_subscriptionEmail;
  env: typeof env;
  http: typeof http;
  init: typeof init;
  messages: typeof messages;
  stripe: typeof stripe;
  threads: typeof threads;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
