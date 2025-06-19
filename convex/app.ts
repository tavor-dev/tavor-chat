import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "@cvx/_generated/server";
import { PLANS } from "@cvx/schema";
import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { User } from "~/types";
import { Id } from "./_generated/dataModel";

export async function internalGetUserById(ctx: QueryCtx, userId: Id<"users">) {
  const [user, subscription] = await Promise.all([
    ctx.db.get(userId),
    ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .unique(),
  ]);
  if (!user) {
    return;
  }
  const plan = subscription?.planId
    ? await ctx.db.get(subscription.planId)
    : undefined;
  const avatarUrl = user.imageId
    ? await ctx.storage.getUrl(user.imageId)
    : user.image;
  return {
    ...user,
    avatarUrl: avatarUrl || undefined,
    subscription:
      subscription && plan
        ? {
            ...subscription,
            planKey: plan.key,
          }
        : undefined,
  };
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<User | undefined> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    return internalGetUserById(ctx, userId);
  },
});

export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }): Promise<User | undefined> => {
    return internalGetUserById(ctx, userId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const [free, pro] = await asyncMap(
      [PLANS.FREE, PLANS.PRO] as const,
      (key) =>
        ctx.db
          .query("plans")
          .withIndex("key", (q) => q.eq("key", key))
          .unique(),
    );
    if (!free || !pro) {
      throw new Error("Plan not found");
    }
    return { free, pro };
  },
});

// export const deleteCurrentUserAccount = mutation({
//   args: {},
//   handler: async (ctx) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       return;
//     }
//     const user = await ctx.db.get(userId);
//     if (!user) {
//       throw new Error("User not found");
//     }
//     const subscription = await ctx.db
//       .query("subscriptions")
//       .withIndex("userId", (q) => q.eq("userId", userId))
//       .unique();
//     if (!subscription) {
//       console.error("No subscription found");
//     } else {
//       await ctx.db.delete(subscription._id);
//       await ctx.scheduler.runAfter(
//         0,
//         internal.stripe.cancelCurrentUserSubscriptions,
//       );
//     }
//     await ctx.db.delete(userId);
//     await asyncMap(["google"], async (provider) => {
//       const authAccount = await ctx.db
//         .query("authAccounts")
//         .withIndex("userIdAndProvider", (q) =>
//           q.eq("userId", userId).eq("provider", provider),
//         )
//         .unique();
//       if (!authAccount) {
//         return;
//       }
//       await ctx.db.delete(authAccount._id);
//     });
//   },
// });
