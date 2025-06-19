import { v } from "convex/values";
import {
  QueryCtx,
  MutationCtx,
  ActionCtx,
  mutation,
  internalQuery,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ThreadDoc } from "./schema";
import { MODEL_CONFIGS, type ModelId } from "../src/lib/models";

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

    if (args.selectedModel) {
      await validateCanUseModel(ctx, args.selectedModel, userId);
    }

    ctx.db.patch(userId, args);
  },
});

/**
 * Internal query to validate if a user can use a specific model
 */
export const validateModelAccess = internalQuery({
  args: {
    model: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { model, userId }) => {
    const modelConfig = MODEL_CONFIGS[model as ModelId];

    if (!modelConfig || !modelConfig.requiresPro) {
      return { allowed: true };
    }

    const effectiveUserId = userId ?? (await getUserId(ctx));

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", effectiveUserId))
      .first();

    const plan = subscription ? await ctx.db.get(subscription.planId) : null;

    if (!plan || plan.key === "free") {
      return {
        allowed: false,
        error: `The ${modelConfig.name} model requires a Pro subscription. Please upgrade to access this model.`,
      };
    }

    return { allowed: true };
  },
});

/**
 * Validates if a user can use a specific model based on their subscription
 * Works in queries, mutations, and actions
 * @param ctx - The action/query/mutation context
 * @param model - The model ID to validate
 * @param userId - Optional user ID, if not provided will get from auth
 * @throws Error if the user cannot use the model
 */
export async function validateCanUseModel(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  model: string,
  userId?: Id<"users"> | null,
): Promise<void> {
  const result = await ctx.runQuery(internal.account.validateModelAccess, {
    model,
    userId: userId ?? undefined,
  });

  if (!result.allowed) {
    throw new Error(result.error);
  }
}
