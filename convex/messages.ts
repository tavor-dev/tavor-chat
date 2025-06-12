import { vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { chatAgent } from "./chat";
import { authorizeThreadAccess } from "./account";

/**
 * Get messages by thread ID with pagination and streaming support
 */
export const getByThreadId = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts, streamArgs } = args;
    await authorizeThreadAccess(ctx, threadId);

    const streams = await chatAgent.syncStreams(ctx, { threadId, streamArgs });
    const paginated = await chatAgent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });

    return {
      ...paginated,
      streams,
    };
  },
});

/**
 * Stop generation of AI response for a thread
 */
export const stopGeneration = mutation({
  args: {
    threadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    await authorizeThreadAccess(ctx, threadId);

    // // Find any active streaming messages for this thread
    // const activeStreams = await ctx.db
    //   .query("agent_streamDeltas")
    //   .filter((q) =>
    //     q.and(
    //       q.eq(q.field("threadId"), args.threadId),
    //       q.eq(q.field("status"), "streaming")
    //     )
    //   )
    //   .collect();
    //
    // // Mark them as stopped
    // for (const stream of activeStreams) {
    //   await ctx.db.patch(stream._id, { status: "stopped" });
    // }

    return null;
  },
});

/**
 * Send a message to a thread
 */
export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { content, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);

    await ctx.runMutation(api.chat.streamAsynchronously, {
      threadId,
      prompt: content,
    });
  },
});

/**
 * Delete a message
 */
// export const deleteMessage = mutation({
//   args: {
//     messageId: v.string(),
//     threadId: v.string(),
//   },
//   returns: v.null(),
//   handler: async (ctx, { threadId, messageId }) => {
//     await authorizeThreadAccess(ctx, threadId);
//
//     await ctx.runMutation(components.agent.messages.deleteMessage)
//
//     // Verify the message belongs to this thread
//     const message = await ctx.db.get(messageId as any);
//
//     if (message && message.threadId !== threadId) {
//       throw new Error("Message does not belong to this thread");
//     }
//
//     if (message) {
//       await ctx.db.delete(message._id);
//     }
//
//     return null;
//   },
// });

/**
 * Get recent messages for a thread (simplified version without pagination)
 */
// export const getRecentMessages = query({
//   args: {
//     threadId: v.string(),
//     limit: v.optional(v.number()),
//   },
//   returns: v.array(v.any()),
//   handler: async (ctx, args) => {
//     await authorizeThreadAccess(ctx, args.threadId);
//
//     const limit = args.limit || 10;
//     const { page: messages } = await chatAgent.listMessages(ctx, {
//       threadId: args.threadId,
//       paginationOpts: {
//         cursor: null,
//         numItems: limit,
//       },
//     });
//
//     // Return in ascending order (oldest first)
//     return messages.reverse();
//   },
// });

/**
 * Search messages within a thread
 */
// export const searchInThread = query({
//   args: {
//     threadId: v.string(),
//     query: v.string(),
//     limit: v.optional(v.number()),
//   },
//   returns: v.array(
//     v.object({
//       _id: v.string(),
//       content: v.string(),
//       role: v.string(),
//       timestamp: v.number(),
//     }),
//   ),
//   handler: async (ctx, args) => {
//     await authorizeThreadAccess(ctx, args.threadId);
//
//     const limit = args.limit || 10;
//
//     const messages = await ctx.db
//       .query("agent_messages")
//       .filter((q) =>
//         q.and(
//           q.eq(q.field("threadId"), args.threadId),
//           q.contains(q.field("content"), args.query),
//         ),
//       )
//       .order("desc")
//       .take(limit);
//
//     return messages.map((m) => ({
//       _id: m._id,
//       content: m.content || "",
//       role: m.role || "user",
//       timestamp: m._creationTime,
//     }));
//   },
// });

/**
 * Internal mutation to update message content
 */
// export const updateMessageContent = internalMutation({
//   args: {
//     messageId: v.string(),
//     content: v.string(),
//   },
//   returns: v.null(),
//   handler: async (ctx, args) => {
//     await ctx.db.patch(args.messageId, { content: args.content });
//     return null;
//   },
// });
