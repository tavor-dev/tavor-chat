import { v } from "convex/values";
import {
  QueryCtx,
  MutationCtx,
  ActionCtx,
  mutation,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ThreadDoc } from "./schema";

/**
 * Get the current user ID from the authenticated session
 */
export async function getUserId(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/**
 * Authorize access to a thread
 */
export async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: Id<"threads">,
): Promise<ThreadDoc | Error> {
  const userId = await getUserId(ctx);

  const thread = await ctx.runQuery(api.chat_engine.threads.getThread, {
    threadId,
  });

  if (!thread || thread.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return thread;
}

export const updateUserPreferences = mutation({
  args: {
    selectedModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    ctx.db.patch(userId, args);
  },
});
