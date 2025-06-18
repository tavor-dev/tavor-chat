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

// Free tier limits
export const FREE_TIER_MESSAGE_LIMIT = 50;
export const FREE_TIER_USAGE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

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
): Promise<ThreadDoc> {
  return await ctx.runQuery(api.threads.getByIdForCurrentUser, { threadId });
}

/**
 * Checks if a user is allowed to send a message based on their plan and usage.
 * Increments message count for free tier users.
 * Throws an error if the user has reached their limit.
 */
export async function checkAndIncrementUsage(ctx: MutationCtx) {
  const userId = await getUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .unique();

  if (subscription) {
    const plan = await ctx.db.get(subscription.planId);
    if (plan && plan.key === "pro") {
      // Pro users have no limits.
      return;
    }
  }

  // User is on Free plan or has no subscription object yet
  const now = Date.now();
  const usageResetTime = user.usageResetTime ?? 0;

  if (now > usageResetTime) {
    // Usage period has reset.
    await ctx.db.patch(user._id, {
      messageCount: 1,
      usageResetTime: now + FREE_TIER_USAGE_PERIOD_MS,
    });
  } else {
    // Still within the usage period.
    const messageCount = user.messageCount ?? 0;
    if (messageCount >= FREE_TIER_MESSAGE_LIMIT) {
      throw new Error("MESSAGE_LIMIT_EXCEEDED");
    }
    await ctx.db.patch(user._id, {
      messageCount: (messageCount ?? 0) + 1,
    });
  }
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
