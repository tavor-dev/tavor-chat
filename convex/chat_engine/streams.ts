import { omit, pick } from "convex-helpers";
import { v } from "convex/values";
import { type StreamDelta, vStreamDelta, vStreamMessage } from "./validators";
import { internal } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
} from "@cvx/_generated/server";
import schema from "@cvx/schema";

const MAX_DELTAS_PER_REQUEST = 1000;
const MAX_DELTAS_PER_STREAM = 100;
const TIMEOUT_INTERVAL = 1000 * 60; // 1 minute

const deltaValidator = schema.tables.streamDeltas.validator;

export const addDelta = mutation({
  args: deltaValidator,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("streamDeltas", args);
    await heartbeatStream(ctx, { streamId: args.streamId });
  },
});

export const listDeltas = query({
  args: {
    threadId: v.id("threads"),
    cursors: v.array(
      v.object({
        streamId: v.id("streamingMessages"),
        cursor: v.number(),
      }),
    ),
  },
  returns: v.array(vStreamDelta),
  handler: async (ctx, args): Promise<StreamDelta[]> => {
    let totalDeltas = 0;
    const deltas: StreamDelta[] = [];
    for (const cursor of args.cursors) {
      const streamDeltas = await ctx.db
        .query("streamDeltas")
        .withIndex("streamId_start_end", (q) =>
          q.eq("streamId", cursor.streamId).gte("start", cursor.cursor),
        )
        .take(
          Math.min(MAX_DELTAS_PER_STREAM, MAX_DELTAS_PER_REQUEST - totalDeltas),
        );
      totalDeltas += streamDeltas.length;
      deltas.push(
        ...streamDeltas.map((d) =>
          pick(d, ["streamId", "start", "end", "parts"]),
        ),
      );
      if (totalDeltas >= MAX_DELTAS_PER_REQUEST) {
        break;
      }
    }
    return deltas;
  },
});

export const create = mutation({
  args: omit(schema.tables.streamingMessages.validator.fields, ["state"]),
  returns: v.id("streamingMessages"),
  handler: async (ctx, args) => {
    const state = {
      kind: "streaming" as const,
      lastHeartbeat: Date.now(),
    };
    const streamId = await ctx.db.insert("streamingMessages", {
      ...args,
      state,
    });
    const timeoutFnId = await ctx.scheduler.runAfter(
      TIMEOUT_INTERVAL,
      internal.chat_engine.streams.timeoutStream,
      { streamId },
    );
    await ctx.db.patch(streamId, { state: { ...state, timeoutFnId } });
    return streamId;
  },
});

export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(vStreamMessage),
  handler: async (ctx, args) => {
    return ctx.db
      .query("streamingMessages")
      .withIndex("threadId_state_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId).eq("state.kind", "streaming"),
      )
      .order("desc")
      .take(100)
      .then((msgs) =>
        msgs.map((m) => ({
          streamId: m._id,
          ...pick(m, [
            "order",
            "stepOrder",
            "userId",
            "agentName",
            "model",
            "provider",
            "providerOptions",
          ]),
        })),
      );
  },
});

export const finish = mutation({
  args: {
    streamId: v.id("streamingMessages"),
    finalDelta: v.optional(deltaValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.finalDelta) {
      await ctx.db.insert("streamDeltas", args.finalDelta);
    }
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${args.streamId}`);
    }
    if (stream.state.kind !== "streaming") {
      throw new Error(`Stream is not streaming: ${args.streamId}`);
    }
    if (stream.state.timeoutFnId) {
      const timeoutFn = await ctx.db.system.get(stream.state.timeoutFnId);
      if (timeoutFn?.state.kind === "pending") {
        await ctx.scheduler.cancel(stream.state.timeoutFnId);
      }
    }
    await ctx.db.patch(args.streamId, {
      state: { kind: "finished", endedAt: Date.now() },
    });
  },
});

async function heartbeatStream(
  ctx: MutationCtx,
  args: { streamId: Id<"streamingMessages"> },
) {
  const stream = await ctx.db.get(args.streamId);
  if (!stream) {
    console.warn("Stream not found", args.streamId);
    return;
  }
  if (stream.state.kind !== "streaming") {
    console.warn("Stream is not streaming", args.streamId);
    return;
  }
  if (Date.now() - stream.state.lastHeartbeat < TIMEOUT_INTERVAL / 4) {
    // Debounce heartbeating.
    return;
  }
  if (!stream.state.timeoutFnId) {
    throw new Error("Stream has no timeout function");
  }
  const timeoutFn = await ctx.db.system.get(stream.state.timeoutFnId);
  if (!timeoutFn) {
    throw new Error("Timeout function not found");
  }
  if (timeoutFn.state.kind !== "pending") {
    throw new Error("Timeout function is not pending");
  }
  await ctx.scheduler.cancel(stream.state.timeoutFnId);
  const timeoutFnId = await ctx.scheduler.runAfter(
    TIMEOUT_INTERVAL,
    internal.chat_engine.streams.timeoutStream,
    { streamId: args.streamId },
  );
  await ctx.db.patch(args.streamId, {
    state: {
      kind: "streaming",
      lastHeartbeat: Date.now(),
      timeoutFnId,
    },
  });
}

export const timeoutStream = internalMutation({
  args: { streamId: v.id("streamingMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      console.warn("Stream not found", args.streamId);
      return;
    }
    await ctx.db.patch(args.streamId, {
      state: {
        kind: "finished",
        endedAt: Date.now(),
      },
    });
  },
});
