import Stripe from "stripe";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { currencyValidator, intervalValidator, PLANS } from "./schema";
import { api, internal } from "./_generated/api";
import { asyncMap } from "convex-helpers";

const ERRORS = {
  STRIPE_CUSTOMER_NOT_FOUND: "Stripe customer not found for this user.",
  STRIPE_SOMETHING_WENT_WRONG: "Something went wrong with Stripe.",
  STRIPE_CHECKOUT_FAILED: "Could not create Stripe checkout session.",
  PLAN_NOT_FOUND: "The target subscription plan could not be found.",
  PRICE_NOT_FOUND: (planName: string) =>
    `Price for plan '${planName}' not found for the specified interval and currency.`,
};

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

/**
 * The following functions are prefixed 'PREAUTH' or 'UNAUTH' because they are
 * used as scheduled functions and do not have a currently authenticated user to
 * reference. PREAUTH means a user id is passed in, and must be authorized prior
 * to scheduling the function. UNAUTH means authorization is not required.
 *
 * All PREAUTH and UNAUTH functions should be internal.
 *
 * Note: this is an arbitrary naming convention, feel free to change or remove.
 */

/**
 * Creates a Stripe customer for a user.
 */
export const PREAUTH_updateCustomerId = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { customerId: args.customerId });
  },
});

export const PREAUTH_getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const PREAUTH_createStripeCustomer = internalAction({
  args: {
    currency: currencyValidator,
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserById, {
      userId: args.userId,
    });
    if (!user || user.customerId) {
      console.error("User not found or already has a customer ID.");
      return;
    }

    const customer = await stripe.customers
      .create({ email: user.email, name: user.username })
      .catch((err) => console.error(err));
    if (!customer) throw new Error("Stripe customer could not be created.");

    await ctx.runAction(internal.stripe.PREAUTH_createFreeStripeSubscription, {
      userId: args.userId,
      customerId: customer.id,
      currency: args.currency,
    });
  },
});

export const UNAUTH_getDefaultPlan = internalQuery({
  handler: async (ctx) => {
    return ctx.db
      .query("plans")
      .withIndex("key", (q) => q.eq("key", PLANS.FREE))
      .unique();
  },
});

export const PREAUTH_getUserByCustomerId = internalQuery({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("customerId", (q) => q.eq("customerId", args.customerId))
      .unique();
    if (!user) {
      return null;
    }
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!subscription) {
      return { ...user, subscription: null };
    }
    const plan = await ctx.db.get(subscription.planId);
    return {
      ...user,
      subscription: {
        ...subscription,
        planKey: plan?.key ?? null,
      },
    };
  },
});

export const PREAUTH_createSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    planId: v.id("plans"),
    priceStripeId: v.string(),
    currency: currencyValidator,
    stripeSubscriptionId: v.string(),
    status: v.string(),
    interval: intervalValidator,
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (subscription) {
      console.warn("Subscription already exists, deleting old one.");
      await ctx.db.delete(subscription._id);
    }
    await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planId: args.planId,
      priceStripeId: args.priceStripeId,
      stripeId: args.stripeSubscriptionId,
      currency: args.currency,
      interval: args.interval,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    });
  },
});

export const PREAUTH_replaceSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    subscriptionStripeId: v.string(),
    input: v.object({
      currency: currencyValidator,
      planStripeId: v.string(),
      priceStripeId: v.string(),
      interval: intervalValidator,
      status: v.string(),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("stripeId", (q) => q.eq("stripeId", args.input.planStripeId))
      .unique();
    if (!plan) {
      throw new Error(ERRORS.PLAN_NOT_FOUND);
    }

    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .unique();

    const newSubscriptionData = {
      planId: plan._id,
      stripeId: args.subscriptionStripeId,
      priceStripeId: args.input.priceStripeId,
      interval: args.input.interval,
      status: args.input.status,
      currency: args.input.currency,
      currentPeriodStart: args.input.currentPeriodStart,
      currentPeriodEnd: args.input.currentPeriodEnd,
      cancelAtPeriodEnd: args.input.cancelAtPeriodEnd,
    };

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, newSubscriptionData);
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        ...newSubscriptionData,
      });
    }
  },
});

export const PREAUTH_deleteSubscription = internalMutation({
  args: {
    subscriptionStripeId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("stripeId", (q) => q.eq("stripeId", args.subscriptionStripeId))
      .unique();
    if (!subscription) {
      // It might have been deleted already, which is fine.
      return;
    }
    await ctx.db.delete(subscription._id);
  },
});

/**
 * Creates a Stripe free tier subscription for a user.
 */
export const PREAUTH_createFreeStripeSubscription = internalAction({
  args: {
    userId: v.id("users"),
    customerId: v.string(),
    currency: currencyValidator,
  },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.stripe.UNAUTH_getDefaultPlan);
    if (!plan) {
      throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);
    }

    const yearlyPrice = plan.prices.year[args.currency];

    const stripeSubscription = await stripe.subscriptions.create({
      customer: args.customerId,
      items: [{ price: yearlyPrice?.stripeId }],
    });
    if (!stripeSubscription) {
      throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);
    }
    await ctx.runMutation(internal.stripe.PREAUTH_createSubscription, {
      userId: args.userId,
      planId: plan._id,
      currency: args.currency,
      priceStripeId: stripeSubscription.items.data[0].price.id,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      interval: "year",
      currentPeriodStart: stripeSubscription.current_period_start,
      currentPeriodEnd: stripeSubscription.current_period_end,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });

    await ctx.runMutation(internal.stripe.PREAUTH_updateCustomerId, {
      userId: args.userId,
      customerId: args.customerId,
    });
  },
});

export const getCurrentUserSubscription = internalQuery({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { currentSubscription: null, newPlan: null };
    }
    const [currentSubscriptionDoc, newPlan] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .unique(),
      ctx.db.get(args.planId),
    ]);

    if (!currentSubscriptionDoc) {
      // User has no subscription record, which is a valid state for upgrading.
      return { currentSubscription: null, newPlan };
    }

    const currentPlan = await ctx.db.get(currentSubscriptionDoc.planId);
    // currentPlan can be null if plan was deleted/re-seeded.
    // The calling function will handle this case.
    return {
      currentSubscription: {
        ...currentSubscriptionDoc,
        plan: currentPlan, // This will be null if plan not found
      },
      newPlan,
    };
  },
});

/**
 * Creates a Stripe checkout session for a user.
 */
export const createSubscriptionCheckout = action({
  args: {
    userId: v.id("users"),
    planId: v.id("plans"),
    planInterval: intervalValidator,
    currency: currencyValidator,
  },
  handler: async (ctx, args): Promise<string | undefined> => {
    // eslint-disable-next-line prefer-const
    let user = await ctx.runQuery(api.app.getCurrentUser);
    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.customerId) {
      console.log("Stripe customer not found for user, creating a new one.");
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? user.username ?? undefined,
      });

      if (!customer) {
        throw new Error("Failed to create Stripe customer.");
      }

      await ctx.runMutation(internal.stripe.PREAUTH_updateCustomerId, {
        userId: user._id,
        customerId: customer.id,
      });
      // Update the local user object to avoid a re-fetch
      user.customerId = customer.id;
    }

    const { currentSubscription, newPlan } = await ctx.runQuery(
      internal.stripe.getCurrentUserSubscription,
      { planId: args.planId },
    );

    // If user has a plan and it's not 'free', they are already on a paid plan.
    if (
      currentSubscription?.plan &&
      currentSubscription.plan.key !== PLANS.FREE
    ) {
      console.log(
        `User is already on plan '${currentSubscription.plan.key}'. Aborting.`,
      );
      return;
    }

    if (!newPlan) {
      throw new Error(ERRORS.PLAN_NOT_FOUND);
    }

    const price = newPlan.prices[args.planInterval][args.currency];
    if (!price?.stripeId) {
      throw new Error(ERRORS.PRICE_NOT_FOUND(newPlan.name));
    }

    const checkout = await stripe.checkout.sessions.create({
      customer: user.customerId,
      line_items: [{ price: price.stripeId, quantity: 1 }],
      mode: "subscription",
      payment_method_types: ["card"],
      success_url: `${process.env.SITE_URL!}/settings?tab=billing&checkout=success`,
      cancel_url: `${process.env.SITE_URL!}/settings?tab=billing&checkout=cancel`,
    });

    if (!checkout?.url) {
      throw new Error(ERRORS.STRIPE_CHECKOUT_FAILED);
    }
    return checkout.url;
  },
});

/**
 * Creates a Stripe customer portal for a user.
 */
export const createCustomerPortal = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const user = await ctx.runQuery(api.app.getCurrentUser);
    if (!user || !user.customerId) {
      throw new Error(ERRORS.STRIPE_CUSTOMER_NOT_FOUND);
    }

    const customerPortal = await stripe.billingPortal.sessions.create({
      customer: user.customerId,
      return_url: `${process.env.SITE_URL!}/settings?tab=billing`,
    });
    if (!customerPortal) {
      throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);
    }
    return customerPortal.url;
  },
});

export const cancelCurrentUserSubscriptions = internalAction({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.app.getCurrentUser);
    if (!user || !user.customerId) {
      throw new Error(ERRORS.STRIPE_CUSTOMER_NOT_FOUND);
    }
    const subscriptions = (
      await stripe.subscriptions.list({ customer: user.customerId })
    ).data.map((sub) => sub.items);

    await asyncMap(subscriptions, async (subscription) => {
      await stripe.subscriptions.cancel(subscription.data[0].subscription);
    });
  },
});
