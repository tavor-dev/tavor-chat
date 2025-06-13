import { assert, omit, pick } from "convex-helpers";
import { paginator } from "convex-helpers/server/pagination";
import { partial } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";
import type { ObjectType } from "convex/values";
import { vThreadDoc } from "@cvx/schema";
import { vPaginationResult } from "./validators";
import { api, internal } from "@cvx/_generated/api";
import {
  action,
  internalMutation,
  mutation,
  type MutationCtx,
  query,
} from "@cvx/_generated/server";
import { deleteMessage } from "./messages";
import schema, { v } from "@cvx/schema";

export const listThreadsByUserId = query({
  args: {
    userId: v.optional(v.id("users")),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .order(args.order ?? "desc")
      .paginate(args.paginationOpts ?? { cursor: null, numItems: 100 });
    return {
      ...threads,
      page: threads.page,
    };
  },
  returns: vPaginationResult(vThreadDoc),
});

const vThread = schema.tables.threads.validator;

export const createThread = mutation({
  args: omit(vThread.fields, ["status"]),
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("threads", {
      ...args,
      status: "active",
    });
    return (await ctx.db.get(threadId))!;
  },
});

export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    patch: v.object(
      partial(pick(vThread.fields, ["title", "summary", "status"])),
    ),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);
    await ctx.db.patch(args.threadId, args.patch);
    return (await ctx.db.get(args.threadId))!;
  },
  returns: vThreadDoc,
});

// When we expose this, we need to also hide all the messages and steps
// export const archiveThread = mutation({
//   args: { threadId: v.id("threads") },
//   handler: async (ctx, args) => {
//     const thread = await ctx.db.get(args.threadId);
//     assert(thread, `Thread ${args.threadId} not found`);
//     await ctx.db.patch(args.threadId, { status: "archived" });
//     return (await ctx.db.get(args.threadId))!;
//   },
//   returns: vThreadDoc,
// });

// TODO: delete thread

const deleteThreadArgs = {
  threadId: v.id("threads"),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
type DeleteThreadArgs = ObjectType<typeof deleteThreadArgs>;
const deleteThreadReturns = {
  cursor: v.string(),
  isDone: v.boolean(),
};
type DeleteThreadReturns = ObjectType<typeof deleteThreadReturns>;

/**
 * Use this to delete a thread and everything it contains.
 * It will try to delete all pages synchronously.
 * If it times out or fails, you'll have to run it again.
 */
export const deleteAllForThreadIdSync = action({
  args: deleteThreadArgs,
  handler: async (ctx, args) => {
    let cursor = args.cursor;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await ctx.runMutation(
        internal.chat_engine.threads._deletePageForThreadId,
        { threadId: args.threadId, cursor, limit: args.limit },
      );
      if (result.isDone) {
        break;
      }
      cursor = result.cursor;
    }
  },
  returns: v.null(),
});

export const _deletePageForThreadId = internalMutation({
  args: deleteThreadArgs,
  handler: deletePageForThreadIdHandler,
  returns: deleteThreadReturns,
});

/**
 * Use this to delete a thread and everything it contains.
 * It will continue deleting pages asynchronously.
 */
export const deleteAllForThreadIdAsync = mutation({
  args: deleteThreadArgs,
  handler: async (ctx, args) => {
    const result = await deletePageForThreadIdHandler(ctx, args);
    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        api.chat_engine.threads.deleteAllForThreadIdAsync,
        {
          threadId: args.threadId,
          cursor: result.cursor,
        },
      );
    }
    return result;
  },
  returns: deleteThreadReturns,
});

async function deletePageForThreadIdHandler(
  ctx: MutationCtx,
  args: DeleteThreadArgs,
): Promise<DeleteThreadReturns> {
  const messages = await paginator(ctx.db, schema)
    .query("messages")
    .withIndex("threadId_status_tool_order_stepOrder", (q) =>
      q.eq("threadId", args.threadId),
    )
    .paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  if (messages.isDone) {
    await ctx.db.delete(args.threadId);
  }
  return {
    cursor: messages.continueCursor,
    isDone: messages.isDone,
  };
}
