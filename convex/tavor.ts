import { Tavor } from "@tavor/sdk";
import { v } from "convex/values";
import invariant from "tiny-invariant";
import { z } from "zod";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { createTool, ToolCtx } from "./chat_engine/client";

export const DEFAULT_BOX_TIMEOUT = 60 * 60 * 6;
const MAX_OUTPUT_LENGTH = 1000;

/**
 * Truncate text to a maximum length and add ellipsis if truncated
 */
function truncateOutput(
  text: string,
  maxLength: number = MAX_OUTPUT_LENGTH,
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return (
    text.substring(0, maxLength) +
    "...\n[Output truncated - showing first " +
    maxLength +
    " characters]"
  );
}

/**
 * AI tools
 */
export const setupTavorTools = ({ threadId }: { threadId: Id<"threads"> }) => {
  return {
    executeCommand: createTool({
      description: `Execute bash commands in a sandboxed environment.

Each chat thread generates an ephemeral sandbox to run the command, if you want to run multiple commands, chain them or write a script that you execute.

The sandbox may get killed as it only lasts a few hours, so files you create may be temporary, but should still last the current session.

IMPORTANT: for commands that should run in the background (i.e. webservers etc), run them separately with background: true

Note: Command output is limited to ${MAX_OUTPUT_LENGTH} characters to prevent overwhelming responses.

Returns JSON with: { output: string, exitCode: number, success: boolean, background: boolean }`,
      args: z.object({
        command: z.string().describe("The command to execute inside sandbox"),
        background: z
          .boolean()
          .describe(
            "true if the command should run in the background (don't expect output)",
          ),
      }),
      handler: async (ctx, { command, background }) => {
        await validateToolThread(ctx, threadId);

        return await ctx.runAction(internal.tavor.runCommandInBox, {
          threadId,
          command,
          background,
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
  const thread = await ctx.runQuery(internal.threads.getById, { threadId });
  if (!thread) {
    throw new Error("couldn't find thread");
  }
  if (!thread.userId) {
    throw new Error("no user associated");
  }
  const user = await ctx.runQuery(internal.app.getUserById, {
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
    background: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, command, background }) => {
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    const tavorBox = await ctx.runAction(internal.tavor.ensureBox, {
      threadId,
    });

    const tavor = new Tavor();
    const box = await tavor.getBox(tavorBox);
    await box.refresh();

    if (background) {
      // Start the command in background
      // const commandPromise = box.run(command);

      // TODO: kinda hack, ensure command gets scheduled by convex before function shuts down
      await new Promise((resolve) => {
        setTimeout(resolve, 3000);
      });

      return JSON.stringify({
        output: "Command is running in the background",
        exit_code: 0,
        success: true,
        background: true,
      });
    }

    const result = await box.run(command);

    // Create a clean, single output combining stdout and stderr if present
    let combinedOutput = result.stdout || "";
    if (result.stderr) {
      combinedOutput += (combinedOutput ? "\n" : "") + result.stderr;
    }

    const truncatedOutput = truncateOutput(combinedOutput);
    const success = result.exitCode === 0;

    return JSON.stringify({
      output: truncatedOutput,
      exit_code: result.exitCode,
      success: success,
      background: false,
    });
  },
});

export const clearBox = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    await ctx.db.patch(threadId, { tavorBox: undefined });
  },
});

export const setBox = internalMutation({
  args: {
    threadId: v.id("threads"),
    tavorBox: v.string(),
  },
  handler: async (ctx, { threadId, tavorBox }) => {
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
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
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    const tavor = new Tavor();

    if (thread.tavorBox) {
      const box = await tavor.getBox(thread.tavorBox);
      await box.refresh();

      if (box.state === "running") {
        // return early with the already-existing box
        return box.id;
      }

      await ctx.runMutation(internal.tavor.clearBox, { threadId });
    }

    const box = await tavor.createBox({ timeout: DEFAULT_BOX_TIMEOUT });
    await box.waitUntilReady();

    await ctx.runMutation(internal.tavor.setBox, {
      threadId,
      tavorBox: box.id,
    });

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
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
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
