import { paginator } from "convex-helpers/server/pagination";
import { stream } from "convex-helpers/server/stream";
import { nullable } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";
import type { ObjectType } from "convex/values";
import { vPaginationResult } from "./validators";
import { internal } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
  query,
} from "@cvx/_generated/server";
import { deleteMessage } from "./messages";
import schema, { v } from "@cvx/schema";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateSystemPromptSettings = mutation({
  args: {
    customSystemPrompt: v.optional(v.string()),
    systemPromptMode: v.optional(
      v.union(v.literal("enhance"), v.literal("replace")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    await ctx.db.patch(userId, {
      customSystemPrompt: args.customSystemPrompt,
      systemPromptMode: args.systemPromptMode,
    });
  },
});

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Note: it only searches for users with threads
export const listUsersWithThreads = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await stream(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q)
      .filterWith(async (q) => !!q.userId)
      .distinct(["userId"])
      .paginate(args.paginationOpts);
    return {
      ...results,
      page: results.page
        .map((t) => t.userId)
        .filter((t): t is Id<"users"> => !!t),
    };
  },
  returns: vPaginationResult(v.string()),
});

export const deleteAllForUserId = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    let threadsCursor = null;
    let threadInProgress = null;
    let messagesCursor = null;
    let isDone = false;
    while (!isDone) {
      ({ messagesCursor, threadInProgress, threadsCursor, isDone } =
        await ctx.runMutation(internal.chat_engine.users._deletePageForUserId, {
          userId: args.userId,
          messagesCursor,
          threadInProgress,
          threadsCursor,
        }));
    }
  },
  returns: v.null(),
});

export const deleteAllForUserIdAsync = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const isDone = await deleteAllForUserIdAsyncHandler(ctx, {
      userId: args.userId,
      messagesCursor: null,
      threadsCursor: null,
      threadInProgress: null,
    });
    return isDone;
  },
  returns: v.boolean(),
});

const deleteAllArgs = {
  userId: v.id("users"),
  messagesCursor: nullable(v.string()),
  threadsCursor: nullable(v.string()),
  threadInProgress: nullable(v.id("threads")),
};
type DeleteAllArgs = ObjectType<typeof deleteAllArgs>;
const deleteAllReturns = {
  threadsCursor: v.string(),
  threadInProgress: nullable(v.id("threads")),
  messagesCursor: nullable(v.string()),
  isDone: v.boolean(),
};
type DeleteAllReturns = ObjectType<typeof deleteAllReturns>;

export const _deleteAllForUserIdAsync = internalMutation({
  args: deleteAllArgs,
  handler: deleteAllForUserIdAsyncHandler,
  returns: v.boolean(),
});

async function deleteAllForUserIdAsyncHandler(
  ctx: MutationCtx,
  args: DeleteAllArgs,
): Promise<boolean> {
  const result = await deletePageForUserId(ctx, args);
  if (!result.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.chat_engine.users._deleteAllForUserIdAsync,
      {
        userId: args.userId,
        ...result,
      },
    );
  }
  return result.isDone;
}

export const _deletePageForUserId = internalMutation({
  args: deleteAllArgs,
  handler: deletePageForUserId,
  returns: deleteAllReturns,
});
async function deletePageForUserId(
  ctx: MutationCtx,
  args: DeleteAllArgs,
): Promise<DeleteAllReturns> {
  let threadInProgress: Id<"threads"> | null = args.threadInProgress;
  let threadsCursor: string | null = args.threadsCursor;
  let messagesCursor: string | null = args.messagesCursor;
  if (!threadsCursor || !threadInProgress) {
    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate({
        numItems: 1,
        cursor: args.threadsCursor ?? null,
      });
    threadsCursor = threads.continueCursor;
    if (threads.page.length > 0) {
      threadInProgress = threads.page[0]._id;
      messagesCursor = null;
    } else {
      return {
        isDone: true,
        threadsCursor,
        threadInProgress,
        messagesCursor,
      };
    }
  }
  // TODO: make a stream of thread queries and delete those in pages
  // then get rid of the "userId" index.
  const messages = await paginator(ctx.db, schema)
    .query("messages")
    .withIndex("threadId_status_tool_order_stepOrder", (q) =>
      q.eq("threadId", threadInProgress!),
    )
    .order("desc")
    .paginate({
      numItems: 100,
      cursor: args.messagesCursor,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  if (messages.isDone) {
    await ctx.db.delete(threadInProgress);
    threadInProgress = null;
    messagesCursor = null;
  } else {
    messagesCursor = messages.continueCursor;
  }
  return {
    messagesCursor,
    threadsCursor,
    threadInProgress,
    isDone: false,
  };
}

export const getThreadUserId = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    return thread?.userId ?? null;
  },
});
