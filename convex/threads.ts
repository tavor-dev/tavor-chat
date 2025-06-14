import { paginationOptsValidator, PaginationResult } from "convex/server";
import { ThreadDoc, v } from "./schema";
import { api } from "./_generated/api";
import { action, internalAction, mutation, query } from "./_generated/server";
import { chatAgent } from "./chat";
import { authorizeThreadAccess, getUserId } from "./account";
import { partial } from "convex-helpers/validators";
import { assert, pick } from "convex-helpers";
import { Id } from "./_generated/dataModel";

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
export const getById = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const getByIdForCurrentUser = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await authorizeThreadAccess(ctx, args.threadId);

    return thread;
  },
});

/**
 * Search threads by content in their messages
 */
// export const search = query({
//   args: {
//     query: v.string(),
//     paginationOpts: paginationOptsValidator,
//   },
//   returns: v.object({
//     page: v.array(
//       v.object({
//         threadId: v.string(),
//         thread: v.object({
//           _id: v.string(),
//           _creationTime: v.number(),
//           userId: v.string(),
//           metadata: v.any(),
//         }),
//         relevantMessages: v.array(
//           v.object({
//             _id: v.string(),
//             content: v.string(),
//             timestamp: v.number(),
//           }),
//         ),
//       }),
//     ),
//     isDone: v.boolean(),
//     continueCursor: v.union(v.string(), v.null()),
//   }),
//   handler: async (ctx, args) => {
//     const userid = await getuserid(ctx);
//
//     const messages = await ctx.runaction(
//       api.chat_engine.messages.searchmessages,
//       { searchallmessagesforuserid: userid },
//     );
//
//     const threadids = userthreads.map((t) => t._id);
//
//     // search messages within those threads
//     const searchresults = [];
//
//     for (const thread of userthreads) {
//       const messages = await ctx.db
//         .query("agent_messages")
//         .filter((q) =>
//           q.and(
//             q.eq(q.field("threadid"), thread._id),
//             q.contains(q.field("content"), args.query),
//           ),
//         )
//         .take(5); // limit messages per thread
//
//       if (messages.length > 0) {
//         searchresults.push({
//           threadid: thread._id,
//           thread,
//           relevantmessages: messages.map((m) => ({
//             _id: m._id,
//             content: m.content || "",
//             timestamp: m._creationTime,
//           })),
//         });
//       }
//     }
//
//     // Manual pagination of results
//     const startIndex = args.paginationOpts.cursor
//       ? parseInt(args.paginationOpts.cursor)
//       : 0;
//     const endIndex = startIndex + args.paginationOpts.numItems;
//
//     const page = searchResults.slice(startIndex, endIndex);
//     const isDone = endIndex >= searchResults.length;
//     const continueCursor = isDone ? null : endIndex.toString();
//
//     return {
//       page,
//       isDone,
//       continueCursor,
//     };
//   },
// });

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
