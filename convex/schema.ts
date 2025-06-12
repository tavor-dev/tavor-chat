import { authTables } from "@convex-dev/auth/server";
import { omit } from "convex-helpers";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  vFinishReason,
  vLanguageModelV1CallWarning,
  vMessage,
  vMessageStatus,
  vProviderMetadata,
  vProviderOptions,
  vReasoningDetails,
  vSource,
  vTextStreamPart,
  vThreadStatus,
  vUsage,
} from "./chat_engine/validators";
import vectorTables, { vVectorId } from "./chat_engine/vector/tables";
import { typedV } from "convex-helpers/validators";

export const CURRENCIES = {
  USD: "usd",
  EUR: "eur",
} as const;
export const currencyValidator = v.union(
  v.literal(CURRENCIES.USD),
  v.literal(CURRENCIES.EUR),
);
export type Currency = Infer<typeof currencyValidator>;

export const INTERVALS = {
  MONTH: "month",
  YEAR: "year",
} as const;
export const intervalValidator = v.union(
  v.literal(INTERVALS.MONTH),
  v.literal(INTERVALS.YEAR),
);
export type Interval = Infer<typeof intervalValidator>;

export const PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;
export const planKeyValidator = v.union(
  v.literal(PLANS.FREE),
  v.literal(PLANS.PRO),
);
export type PlanKey = Infer<typeof planKeyValidator>;

const priceValidator = v.object({
  stripeId: v.string(),
  amount: v.number(),
});
const pricesValidator = v.object({
  [CURRENCIES.USD]: priceValidator,
  [CURRENCIES.EUR]: priceValidator,
});

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    customerId: v.optional(v.string()),
    selectedModel: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("customerId", ["customerId"]),

  plans: defineTable({
    key: planKeyValidator,
    stripeId: v.string(),
    name: v.string(),
    description: v.string(),
    prices: v.object({
      [INTERVALS.MONTH]: pricesValidator,
      [INTERVALS.YEAR]: pricesValidator,
    }),
  })
    .index("key", ["key"])
    .index("stripeId", ["stripeId"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    planId: v.id("plans"),
    priceStripeId: v.string(),
    stripeId: v.string(),
    currency: currencyValidator,
    interval: intervalValidator,
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  })
    .index("userId", ["userId"])
    .index("stripeId", ["stripeId"]),

  threadData: defineTable({
    threadId: v.id("threads"),
    pinned: v.boolean(),
    model: v.optional(v.string()),
  }).index("threadId", ["threadId"]),

  threads: defineTable({
    userId: v.optional(v.id("users")), // Unset for anonymous
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: vThreadStatus,
    // DEPRECATED
    defaultSystemPrompt: v.optional(v.string()),
    parentThreadIds: v.optional(v.array(v.id("threads"))),
    order: /*DEPRECATED*/ v.optional(v.number()),
  }).index("userId", ["userId"]),

  messages: defineTable({
    id: v.optional(v.string()), // external id, e.g. from Vercel AI SDK
    userId: v.optional(v.id("users")), // useful for searching across threads
    threadId: v.id("threads"),
    order: v.number(),
    stepOrder: v.number(),
    embeddingId: v.optional(vVectorId),
    fileIds: v.optional(v.array(v.id("files"))),
    error: v.optional(v.string()),
    status: vMessageStatus,

    // Context on how it was generated
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(vProviderOptions), // Sent to model

    // The result
    message: v.optional(vMessage),
    // Convenience fields extracted from the message
    tool: v.boolean(), // either tool call (assistant) or tool result (tool)
    text: v.optional(v.string()),

    // Result metadata
    usage: v.optional(vUsage),
    providerMetadata: v.optional(vProviderMetadata), // Received from model
    sources: v.optional(v.array(vSource)),
    reasoning: v.optional(v.string()),
    reasoningDetails: v.optional(vReasoningDetails),
    warnings: v.optional(v.array(vLanguageModelV1CallWarning)),
    finishReason: v.optional(vFinishReason),
    // DEPRECATED
    parentMessageId: v.optional(v.id("messages")),
    stepId: v.optional(v.string()),
    files: v.optional(v.array(v.any())),
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("threadId_status_tool_order_stepOrder", [
      "threadId",
      "status",
      // TODO: we might not need this to be in the index..
      "tool",
      "order",
      "stepOrder",
    ])
    // Allows text search on message content
    .searchIndex("text_search", {
      searchField: "text",
      filterFields: ["userId", "threadId"],
    })
    // Allows finding messages by vector embedding id
    .index("embeddingId", ["embeddingId"]),

  // Status: if it's done, it's deleted, then deltas are vacuumed
  streamingMessages: defineTable({
    // extra metadata?
    userId: v.optional(v.id("users")),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(vProviderOptions), // Sent to model

    threadId: v.id("threads"),
    order: v.number(),
    /**
     * The step order of the first message in the stream.
     * If the stream ends up with both a tool call and a tool result,
     * the stepOrder of the result will be +1 of the tool call.
     */
    stepOrder: v.number(),
    state: v.union(
      v.object({
        kind: v.literal("streaming"),
        lastHeartbeat: v.number(),
        timeoutFnId: v.optional(v.id("_scheduled_functions")),
      }),
      v.object({
        kind: v.literal("finished"),
        endedAt: v.number(),
      }),
      v.object({
        kind: v.literal("error"),
        error: v.string(),
      }),
    ),
  })
    // There should only be one per "order" index
    // If another exists, it's deleted and replaced
    .index("threadId_state_order_stepOrder", [
      "threadId",
      "state.kind",
      "order",
      "stepOrder",
    ]),

  streamDeltas: defineTable({
    streamId: v.id("streamingMessages"),
    // the indexes work like: 0 <first> 1 <second> 2 <third> 3 ...
    start: v.number(), // inclusive
    end: v.number(), // exclusive
    parts: v.array(vTextStreamPart),
  }).index("streamId_start_end", ["streamId", "start", "end"]),

  memories: defineTable({
    threadId: v.optional(v.id("threads")),
    userId: v.optional(v.id("users")),
    memory: v.string(),
    embeddingId: v.optional(vVectorId),
  })
    .index("threadId", ["threadId"])
    .index("userId", ["userId"])
    .index("embeddingId", ["embeddingId"]),

  files: defineTable({
    storageId: v.string(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    hash: v.string(),
    refcount: v.number(),
    lastTouchedAt: v.number(),
  })
    .index("hash", ["hash"])
    .index("refcount", ["refcount"]),

  ...vectorTables,
});

export default schema;

export const vv = typedV(schema);
export { vv as v };

const user = schema.tables.users.validator;
const threadData = schema.tables.threadData.validator;

export type User = Infer<typeof user>;
export type ThreadData = Infer<typeof threadData>;

export const vThreadDoc = v.object({
  _id: v.id("threads"),
  _creationTime: v.number(),
  userId: v.optional(v.id("users")), // Unset for anonymous
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  status: vThreadStatus,
});
export type ThreadDoc = Infer<typeof vThreadDoc>;

export const vMessageDoc = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  ...omit(schema.tables.messages.validator.fields, [
    "parentMessageId",
    "stepId",
    "files",
  ]),
  threadId: v.id("threads"),
  embeddingId: v.optional(vVectorId),
  fileIds: v.optional(v.array(v.id("files"))),
});
export type MessageDoc = Infer<typeof vMessageDoc>;
