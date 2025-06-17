import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { chatAgent } from "./chat";
import { authorizeThreadAccess } from "./account";
import { vStreamArgs } from "./chat_engine/validators";
import { Id } from "./_generated/dataModel";
import { vFullMessageDoc } from "./schema";
import { deleteMessage } from "./chat_engine/messages";

/**
 * Get messages by thread ID with pagination and streaming support
 */
export const getByThreadId = query({
  args: {
    threadId: v.id("threads"),
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
 * Fork thread from a specific message
 */
export const forkAt = mutation({
  args: {
    messageId: v.id("messages"),
    newModel: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, newModel }): Promise<Id<"threads">> => {
    const message = await ctx.db.get(messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    const currentThread = await authorizeThreadAccess(ctx, message.threadId);

    // generate new thread immediately to get an ID, then copy in the background
    const newThreadId = await ctx.runMutation(api.threads.create, {
      title: currentThread.title,
      model: newModel ?? currentThread.model,
      forkParentId: currentThread._id,
      forkParentMessageId: message._id,
    });

    // Schedule copying messages in the background
    ctx.scheduler.runAfter(0, internal.messages.copyMessagesFromThread, {
      newThreadId,
      fromThreadId: currentThread._id,
      untilMessageId: messageId,
    });

    return newThreadId;
  },
});

export const copyMessagesFromThread = internalAction({
  args: {
    newThreadId: v.id("threads"),
    fromThreadId: v.id("threads"),
    untilMessageId: v.id("messages"),
  },
  handler: async (ctx, { newThreadId, fromThreadId, untilMessageId }) => {
    const targetMessage = await ctx.runQuery(internal.messages.getMessage, {
      messageId: untilMessageId,
    });

    if (!targetMessage) {
      throw new Error("Target message not found");
    }

    // Get all messages from the source thread up to and including the target message
    const messages = await ctx.runQuery(internal.messages.getMessagesUntil, {
      threadId: fromThreadId,
      untilMessageId,
      targetOrder: targetMessage.order,
    });

    for (const message of messages) {
      await ctx.runMutation(internal.messages.copyMessage, {
        message,
        newThreadId,
      });
    }
  },
});

/**
 * Stop generation of AI response for a thread
 */
export const stopGeneration = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    await authorizeThreadAccess(ctx, threadId);

    return null;
  },
});

/**
 * Edit a message in a thread
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { content, messageId, model }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await authorizeThreadAccess(ctx, message.threadId);

    if (message.message?.role !== "user") {
      throw new Error("only user messages can be edited");
    }

    await ctx.runMutation(internal.messages.deleteMessagesFrom, {
      threadId: message.threadId,
      order: message.order,
    });

    await ctx.runMutation(api.chat.streamAsynchronously, {
      threadId: message.threadId,
      prompt: content,
      model,
      files: message?.fileIds?.map((id) => ({ fileId: id })),
    });
  },
});

/**
 * Regenerate a message in a thread
 */
export const regenerate = mutation({
  args: {
    messageId: v.id("messages"),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, model }) => {
    let message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await authorizeThreadAccess(ctx, message.threadId);

    if (message.message?.role !== "user") {
      // find parent to ensure we only re-gen based on the user message
      message = await ctx.db
        .query("messages")
        .withIndex("threadId_status_tool_order_stepOrder", (q) =>
          q.eq("threadId", message!.threadId),
        )
        .filter((q) => q.eq(q.field("order"), message!.order))
        .first();
    }

    if (!message) {
      throw new Error("couldn't find user message, unexpected error");
    }

    await ctx.runMutation(api.messages.editMessage, {
      messageId: message._id,
      content: message.text!,
      model,
    });
  },
});

/**
 * Internal query to get a single message
 */
export const getMessage = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    return await ctx.db.get(messageId);
  },
});

/**
 * Internal query to get messages up to a specific message
 */
export const getMessagesUntil = internalQuery({
  args: {
    threadId: v.id("threads"),
    untilMessageId: v.id("messages"),
    targetOrder: v.number(),
  },
  handler: async (ctx, { threadId, targetOrder }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", threadId),
      )
      .filter((q) => q.lte(q.field("order"), targetOrder))
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Internal mutation to copy a message to a new thread
 */
export const copyMessage = internalMutation({
  args: {
    message: vFullMessageDoc,
    newThreadId: v.id("threads"),
  },
  handler: async (ctx, { message, newThreadId }) => {
    // Copy the message to the new thread, removing relations and system fields
    const { _id, _creationTime, embeddingId, ...messageToCopy } = message;

    await ctx.db.insert("messages", {
      ...messageToCopy,
      threadId: newThreadId,
    });

    if (message.fileIds && message.fileIds.length > 0) {
      for (const fileId of message.fileIds) {
        await ctx.runMutation(api.chat_engine.files.copyFile, { fileId });
      }
    }
  },
});

/**
 * Internal mutation to delete all messages after a specific order/stepOrder
 */
export const deleteMessagesFrom = internalMutation({
  args: {
    threadId: v.id("threads"),
    order: v.number(),
  },
  handler: async (ctx, { threadId, order }) => {
    const messagesToDelete = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", threadId),
      )
      .filter((q) => q.gte(q.field("order"), order))
      .collect();

    for (const message of messagesToDelete) {
      await deleteMessage(ctx, message);
    }
  },
});
