import { Tavor } from "@tavor/sdk";
import { v } from "./schema";
import invariant from "tiny-invariant";
import { z } from "zod";
import { internal } from "./_generated/api";
import { type Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation } from "./_generated/server";
import { createTool, ToolCtx } from "./chat_engine/client";
import {
  DEFAULT_BOX_TIMEOUT,
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_LENGTH,
  MAX_TIMEOUT_MS,
} from "./tavorNode";
import { partial } from "convex-helpers/validators";
import { authorizeThreadAccess } from "./account";

/**
 * AI tools
 */
export const setupTavorTools = ({ threadId }: { threadId: Id<"threads"> }) => {
  return {
    executeCommand: createTool({
      description: `Execute bash commands in a sandboxed environment.

You have exclusive access to an ephemeral sandbox that runs your command with:
- **OS**: Ubuntu (24.04 stable)
- **User**: root (full system privileges)
- **Resources**: 2 GB RAM, 10 GB SSD, 1 vCPU
- **Pre-installed**: git, python3, pip, npm, bun, curl, wget, vim, nano, ripgrep
- You can install other tools on demand as needed
- The sandbox may get killed as it only lasts a few hours, so files you create may be temporary, but should still last the current session.

Usage instructions:

- You can specify an optional timeout in milliseconds (up to ${MAX_TIMEOUT_MS}ms / ${MAX_TIMEOUT_MS / 60000} minutes). If not specified, commands will timeout after ${DEFAULT_TIMEOUT_MS}ms (${DEFAULT_TIMEOUT_MS / 60000} minutes).
- You can run commands in the background (for e.g webservers, long running processes), by specifying the optional background to true, to keep them running.
- Command output is limited to the last ${MAX_OUTPUT_LENGTH} characters and will be truncated before you receive it.
- Prioritize ripgrep (as rg is installed) over grep and find.
- If you run commands exposing ports in the background, ensure the port is accessible on 0.0.0.0 and not just localhost and the server is running (i.e. with curl or netcat) before telling the user about it.
- You can then generate a preview URL for an exposed web port to allow the user to see the output.
`,
      args: z.object({
        command: z.string().describe("The command to execute inside sandbox"),
        background: z
          .union([z.boolean(), z.null()])
          .describe(
            "true if the command should run in the background (don't expect output). Defaults to false.",
          ),
        timeoutMs: z
          .union([z.number(), z.null()])
          .describe(
            "Timeout in milliseconds for the command. Defaults to 60000ms (60 seconds), max 300000ms (5 minutes).",
          ),
      }),
      handler: async (ctx, { command, background, timeoutMs }) => {
        await validateToolThread(ctx, threadId);

        return await ctx.runAction(internal.tavorNode.runCommandInBox, {
          threadId,
          command,
          background,
          timeoutMs,
        });
      },
    }),
    getPreviewUrl: createTool({
      description:
        "Returns a publicly-visible HTTPS URL that maps to the specified port inside the sandbox.",
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
    forwardPort: createTool({
      description: `Forwards a TCP port inside the sandbox to a random ip:port on the public internet that will be returned by this tool.
DO NOT use this for HTTP traffic, use getPreviewUrl instead. Use this for any other TCP traffic you want to forward to the box, like a teamspeak server, exposing a postgresql to the public etc.
Important: this can expose services to the public internet, double check they are secured with password or similar.`,
      args: z.object({
        port: z.number().describe("The TCP port inside the sandbox to expose"),
      }),
      handler: async (ctx, { port }) => {
        await validateToolThread(ctx, threadId);

        return await ctx.runAction(internal.tavor.exposePort, {
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
 * Internal mutation to claim a thread for a user.
 * Co-located here to avoid codegen issues.
 */
export const _claimThread = internalMutation({
  args: {
    threadId: v.id("threads"),
    patch: v.object(partial(v.doc("threads").fields)),
  },
  handler: async (ctx, { threadId, patch }) => {
    await ctx.db.patch(threadId, patch);
  },
});

/**
 * Box management actions
 */
export const getBoxStatus = action({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const thread = await authorizeThreadAccess(ctx, threadId);

    if (!thread.tavorBox) {
      return { status: "off" };
    }
    try {
      const tavor = new Tavor();
      const box = await tavor.getBox(thread.tavorBox);
      await box.refresh();
      return { status: box.state }; // 'running', 'stopped', etc.
    } catch (e) {
      console.error(e);
      // Box might not be found if it expired and was cleaned up.
      await ctx.runMutation(internal.tavor.clearBox, { threadId });
      return { status: "off" };
    }
  },
});

// Types for action return values
interface BoxActionResult {
  success: boolean;
  message: string;
}

export const startTavorBox = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }): Promise<BoxActionResult> => {
    await authorizeThreadAccess(ctx, threadId);
    const boxId: string = await ctx.runAction(internal.tavor.ensureBox, {
      threadId,
    });
    return { success: true, message: `Box ${boxId} is running.` };
  },
});

export const stopTavorBox = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }): Promise<BoxActionResult> => {
    const thread = await authorizeThreadAccess(ctx, threadId);

    if (thread.tavorBox) {
      const tavor = new Tavor();
      try {
        const box = await tavor.getBox(thread.tavorBox);
        await box.stop();
      } catch (error) {
        console.warn(`Failed to stop box ${thread.tavorBox}:`, error);
      }
      await ctx.runMutation(internal.tavor.clearBox, { threadId });
      return { success: true, message: "Box stopped." };
    }
    return { success: false, message: "No box was running for this thread." };
  },
});

export const restartTavorBox = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }): Promise<BoxActionResult> => {
    const thread = await authorizeThreadAccess(ctx, threadId);

    if (thread.tavorBox) {
      const tavor = new Tavor();
      try {
        const box = await tavor.getBox(thread.tavorBox);
        await box.stop();
      } catch (error) {
        console.warn(
          `Failed to stop box ${thread.tavorBox} during restart:`,
          error,
        );
      }
      await ctx.runMutation(internal.tavor.clearBox, { threadId });
    }

    const boxId: string = await ctx.runAction(internal.tavor.ensureBox, {
      threadId,
    });
    return { success: true, message: `Box restarted. New box is ${boxId}.` };
  },
});

/**
 * Manage boxes
 */
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
      try {
        const box = await tavor.getBox(thread.tavorBox);
        await box.refresh();

        if (box.state === "running") {
          // return early with the already-existing box
          return box.id;
        }
      } catch (e) {
        // Box probably doesn't exist anymore
        console.log("Could not get existing box, creating a new one");
      }

      await ctx.runMutation(internal.tavor.clearBox, { threadId });
    }

    const box = await tavor.createBox({
      timeout: DEFAULT_BOX_TIMEOUT,
      mib_ram: 2048,
    });
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

export const exposePort = internalAction({
  args: {
    threadId: v.id("threads"),
    port: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, port }) => {
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    if (!thread.tavorBox) {
      return "Tavor box is not running, run a command to setup a new box and then expose a port if necessary";
    }

    const tavor = new Tavor();

    const box = await tavor.getBox(thread.tavorBox);
    await box.refresh();

    const exposedPortData = await box.exposePort(port);

    return `Successfully exposed port ${port}. It can be accessed through proxy.tavor.app:${exposedPortData.proxy_port}`;
  },
});
