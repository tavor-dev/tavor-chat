import invariant from "tiny-invariant";
import { z } from "zod";
import { v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import { createTool, ToolCtx } from "./chat_engine/client";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Tavor } from "@tavor/sdk";

/**
 * AI tools
 */
export const setupTavorTools = ({ threadId }: { threadId: Id<"threads"> }) => {
  return {
    executeCommand: createTool({
      description: `Execute bash commands in a sandboxed environment.

Each chat thread generates an ephemeral sandbox to run the command, if you want to run multiple commands, chain them or write a script that you execute.

The sandbox may get killed as it only lasts 24 hours, so files you create may be temporary, but should still last the current session.

IMPORTANT: for commands that should run in the background (i.e. webservers etc, make sure you run them with nohup so you don't await execution)`,
      args: z.object({
        command: z.string().describe("The command to execute inside sandbox"),
      }),
      handler: async (ctx, { command }) => {
        await validateToolThread(ctx, threadId);

        return await ctx.runAction(internal.tavor.runCommandInBox, {
          threadId,
          command,
        });
      },
    }),
    getPreviewUrl: createTool({
      description:
        "Generated a publicly-visible HTTPS URL that maps to the specified port inside the sandbox.",
      args: z.object({
        port: z.number().describe("The port inside the sandbox to look at"),
      }),
      handler: async (ctx, { port }) => {
        await validateToolThread(ctx, threadId);

        return await ctx.runAction(internal.tavor.getPreviewUrl, {
          threadId,
          port,
        });
      },
    }),
  };
};

async function validateToolThread(ctx: ToolCtx, threadId: Id<"threads">) {
  const thread = await ctx.runQuery(api.threads.getById, { threadId });
  if (!thread) {
    throw new Error("couldn't find thread");
  }
  if (!thread.userId) {
    throw new Error("no user associated");
  }
  const user = await ctx.runQuery(api.app.getUserById, {
    userId: thread.userId,
  });
  if (!user) {
    throw new Error("must be authenticated");
  }
  return { thread, user };
}

/**
 * Manage boxes
 */
export const runCommandInBox = internalAction({
  args: {
    threadId: v.id("threads"),
    command: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, command }) => {
    const thread = await ctx.runQuery(api.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    const tavorBox = await ctx.runAction(internal.tavor.ensureBox, {
      threadId,
    });

    const tavor = new Tavor();
    const box = await tavor.getBox(tavorBox);
    await box.refresh();

    let output = "";

    const result = await box.run(command);

    if (result.stdout) output += result.stdout;
    if (result.stderr) output += `STDERR:\n${result.stderr}`;

    return output;
  },
});

export const clearBox = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.runQuery(api.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    await ctx.db.patch(threadId, { tavorBox: undefined });
  },
});

export const setBox = mutation({
  args: {
    threadId: v.id("threads"),
    tavorBox: v.string(),
  },
  handler: async (ctx, { threadId, tavorBox }) => {
    const thread = await ctx.runQuery(api.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    await ctx.db.patch(threadId, { tavorBox });
  },
});

export const ensureBox = internalAction({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.string(),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.runQuery(api.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    const tavor = new Tavor();

    if (thread.tavorBox) {
      const box = await tavor.getBox(thread.tavorBox);
      await box.refresh();

      if (box.state === "running") {
        // return early with the already-existing box
        return box.id;
      }

      await ctx.runMutation(api.tavor.clearBox, { threadId });
    }

    const box = await tavor.createBox({ timeout: 60 * 60 * 24 });
    await box.waitUntilReady();

    await ctx.runMutation(api.tavor.setBox, { threadId, tavorBox: box.id });

    return box.id;
  },
});

export const getPreviewUrl = internalAction({
  args: {
    threadId: v.id("threads"),
    port: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, port }) => {
    const thread = await ctx.runQuery(api.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    if (!thread.tavorBox) {
      return "Tavor box is not running, run a command to setup a new box and then generate a preview URL if necessary";
    }

    const tavor = new Tavor();

    const box = await tavor.getBox(thread.tavorBox);
    await box.refresh();

    return box.getPublicUrl(port);
  },
});
