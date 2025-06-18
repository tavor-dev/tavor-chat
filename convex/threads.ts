import { paginationOptsValidator, PaginationResult } from "convex/server";
import { ThreadDoc, v } from "./schema";
import { api, internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { chatAgent } from "./chat";
import { authorizeThreadAccess, getUserId } from "./account";
import { partial } from "convex-helpers/validators";
import { assert, pick } from "convex-helpers";
import { Doc, Id } from "./_generated/dataModel";
import invariant from "tiny-invariant";
import { ERRORS } from "~/errors";

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

export const maybeUpdateThreadTitle = internalAction({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const { thread } = await chatAgent.continueThread(ctx, { threadId });
    const metadata = await thread.getMetadata();
    const existingTitle = metadata?.title;

    if (!existingTitle || existingTitle === "New chat") {
      try {
        const { text } = await thread.generateText(
          {
            prompt:
              "Generate a concise, descriptive title (max 40 characters) for this conversation based on the messages so far. Return only the title text, no quotes or punctuation at the end.",
          },
          { storageOptions: { saveMessages: "none" } },
        );

        const cleanTitle = text.trim().replace(/["']/g, "").slice(0, 40);

        if (cleanTitle && cleanTitle.length > 0) {
          await thread.updateMetadata({ title: cleanTitle });
        }
      } catch (error) {
        console.error("Failed to generate thread title:", error);
      }
    }
  },
});
