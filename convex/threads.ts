import { paginationOptsValidator, PaginationResult } from "convex/server";
import { ThreadDoc, v } from "./schema";
import { api, internal } from "./_generated/api";
import { z } from "zod";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { chatAgent } from "./chat";
import {
  authorizeThreadAccess,
  getUserId,
  validateCanUseModel,
} from "./account";
import { partial } from "convex-helpers/validators";
import { assert, pick } from "convex-helpers";
import { Doc, Id } from "./_generated/dataModel";
import invariant from "tiny-invariant";
import { ERRORS } from "~/errors";
import { fastCheap } from "~/src/lib/models";

/**
 * List all threads for the current user with pagination
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    { paginationOpts },
  ): Promise<PaginationResult<ThreadDoc>> => {
    const userId = await getUserId(ctx);

    const threads = await ctx.runQuery(
      api.chat_engine.threads.listThreadsByUserId,
      { userId, paginationOpts },
    );

    return threads;
  },
});

/**
 * Get a thread by ID
 */
export const getById = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<ThreadDoc | null> => {
    return await ctx.db.get(args.threadId);
  },
});

export const getByIdForCurrentUser = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }): Promise<ThreadDoc> => {
    const userId = await getUserId(ctx);
    invariant(userId, ERRORS.AUTH_NOT_AUTHENTICATED);

    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread?.userId === userId, ERRORS.THREADS_NOT_ALLOWED);

    return thread;
  },
});

/**
 * Search threads by content in their messages for the current user.
 */
export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, { query: searchQuery }) => {
    if (searchQuery === "") {
      return [];
    }

    const userId = await getUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("messages")
      .withSearchIndex("text_search", (q) =>
        q.search("text", searchQuery).eq("userId", userId),
      )
      .take(100); // Limit to avoid fetching too many messages

    const threadIds = [...new Set(messages.map((m) => m.threadId))];

    if (threadIds.length === 0) {
      return [];
    }

    const threads = await Promise.all(
      threadIds.map((threadId) => ctx.db.get(threadId)),
    );

    // Filter out nulls and sort by most recent creation time.
    return threads.filter((t): t is Doc<"threads"> => t !== null);
  },
});

/**
 * Create a new thread
 */
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    forkParentId: v.optional(v.id("threads")),
    forkParentMessageId: v.optional(v.id("messages")),
  },
  handler: async (
    ctx,
    { title, model, forkParentId, forkParentMessageId },
  ): Promise<Id<"threads">> => {
    const userId = await getUserId(ctx);

    if (model) {
      await validateCanUseModel(ctx, model, userId);
    }

    const newThread = await ctx.runMutation(
      api.chat_engine.threads.createThread,
      {
        userId,
        title,
        model,
        pinned: false,
        ...(forkParentId
          ? {
              forkParent: {
                threadId: forkParentId!,
                messageId: forkParentMessageId!,
                title,
              },
            }
          : {}),
      },
    );
    return newThread._id;
  },
});

export const update = mutation({
  args: {
    threadId: v.id("threads"),
    patch: v.object(
      partial(
        pick(v.doc("threads").fields, [
          "title",
          "summary",
          "status",
          "model",
          "pinned",
        ]),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);

    if (args.patch.model) {
      await validateCanUseModel(ctx, args.patch.model);
    }

    await ctx.db.patch(args.threadId, args.patch);
    return (await ctx.db.get(args.threadId))!;
  },
});

/**
 * Delete a thread
 */
export const deleteThread = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    await authorizeThreadAccess(ctx, threadId);

    await ctx.runAction(api.chat_engine.threads.deleteAllForThreadIdSync, {
      threadId,
    });

    return null;
  },
});

export const updateGeneratingStatus = internalMutation({
  args: {
    threadId: v.id("threads"),
    generating: v.boolean(),
  },
  handler: async (ctx, { threadId, generating }) => {
    await ctx.db.patch(threadId, {
      generating,
      ...(!generating ? { cancelRequested: false } : {}),
    });
  },
});

export const maybeUpdateThreadTitle = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const { thread } = await chatAgent.continueThread(ctx, { threadId });
    const metadata = await thread.getMetadata();
    const existingTitle = metadata?.title;

    if (!existingTitle || existingTitle === "New chat") {
      try {
        const { object } = await thread.generateObject(
          {
            model: fastCheap,
            schema: z.object({
              title: z.string().max(40).describe("the short title"),
            }),
            prompt:
              "Generate a concise, descriptive title (max 40 characters) for this conversation based on the messages so far. Return only the title text, no quotes or punctuation at the end.",
          },
          { storageOptions: { saveMessages: "none" } },
        );

        const cleanTitle = object.title
          .trim()
          .replace(/["']/g, "")
          .slice(0, 40);

        if (cleanTitle && cleanTitle.length > 0) {
          await thread.updateMetadata({ title: cleanTitle });
        }
      } catch (error) {
        console.error("Failed to generate thread title:", error);
      }
    }
  },
});

/**
 * Internal mutation to clean up stuck threads
 * Finds threads that are marked as generating but have no active streams
 */
export const cleanupStuckThreads = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all threads marked as generating
    const generatingThreads = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("generating"), true))
      .collect();

    let cleanedCount = 0;

    for (const thread of generatingThreads) {
      // Check if this thread has any active streaming messages
      const activeStreams = await ctx.db
        .query("streamingMessages")
        .withIndex("threadId_state_order_stepOrder", (q) =>
          q.eq("threadId", thread._id).eq("state.kind", "streaming"),
        )
        .take(1);

      if (activeStreams.length === 0) {
        // No active streams - this thread is stuck
        // Get the last message in this thread to check when it was last active
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) =>
            q.eq("threadId", thread._id),
          )
          .order("desc")
          .first();

        // Use the last message's creation time if available, otherwise fall back to thread creation time
        const lastActivityTime =
          lastMessage?._creationTime ?? thread._creationTime;
        const timeSinceUpdate = Date.now() - lastActivityTime;

        // Only clean up if the thread has been stuck for more than 1 minute
        if (timeSinceUpdate > 60000) {
          console.log(`Cleaning up stuck thread ${thread._id}`);
          await ctx.db.patch(thread._id, {
            generating: false,
            cancelRequested: false,
          });
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} stuck threads`);
    }

    return { cleanedCount };
  },
});
