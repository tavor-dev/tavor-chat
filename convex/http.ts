import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { ActionCtx, httpAction } from "@cvx/_generated/server";
import { ERRORS } from "~/errors";
import { stripe } from "@cvx/stripe";
import { STRIPE_WEBHOOK_SECRET } from "@cvx/env";
import { z } from "zod";
import { internal } from "@cvx/_generated/api";
import { Currency, Interval, PLANS } from "@cvx/schema";
import {
  sendSubscriptionErrorEmail,
  sendSubscriptionSuccessEmail,
} from "@cvx/email/templates/subscriptionEmail";
import Stripe from "stripe";
import { Doc } from "@cvx/_generated/dataModel";

const http = httpRouter();

/**
 * Gets and constructs a Stripe event signature.
 *
 * @throws An error if Stripe signature is missing or if event construction fails.
 * @returns The Stripe event object.
 */
async function getStripeEvent(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error(`Stripe - ${ERRORS.ENVS_NOT_INITIALIZED}`);
  }

  try {
    const signature = request.headers.get("Stripe-Signature");
    if (!signature) throw new Error(ERRORS.STRIPE_MISSING_SIGNATURE);
    const payload = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
    return event;
  } catch (err: unknown) {
    console.log(err);
    throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);
  }
}

const handleUpdateSubscription = async (
  ctx: ActionCtx,
  user: Doc<"users">,
  subscription: Stripe.Subscription,
) => {
  const subscriptionItem = subscription.items.data[0];
  await ctx.runMutation(internal.stripe.PREAUTH_replaceSubscription, {
    userId: user._id,
    subscriptionStripeId: subscription.id,
    input: {
      currency: subscription.items.data[0].price.currency as Currency,
      planStripeId: subscriptionItem.plan.product as string,
      priceStripeId: subscriptionItem.price.id,
      interval: subscriptionItem.plan.interval as Interval,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
};

const handleInvoicePaymentSucceeded = async (
  ctx: ActionCtx,
  event: Stripe.InvoicePaymentSucceededEvent,
) => {
  const invoice = event.data.object;

  const { customer: customerId, subscription: subscriptionId } = z
    .object({
      customer: z.string().nullable().optional(),
      subscription: z.string().nullable().optional(),
    })
    .parse(invoice);

  if (!customerId || !subscriptionId) {
    return new Response(null, { status: 200 });
  }

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });

  if (!user) {
    console.error(`User not found for customer ID: ${customerId}`);
    return new Response(null, { status: 200 });
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleUpdateSubscription(ctx, user, subscription);

  return new Response(null);
};

const handleCheckoutSessionCompleted = async (
  ctx: ActionCtx,
  event: Stripe.CheckoutSessionCompletedEvent,
) => {
  const session = event.data.object;

  const { customer: customerId, subscription: subscriptionId } = z
    .object({ customer: z.string(), subscription: z.string() })
    .parse(session);

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });
  if (!user || !user.email) {
    throw new Error(ERRORS.SOMETHING_WENT_WRONG);
  }

  const freeSubscriptionStripeId =
    user.subscription && user.subscription.planKey === PLANS.FREE
      ? user.subscription.stripeId
      : undefined;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleUpdateSubscription(ctx, user, subscription);

  await sendSubscriptionSuccessEmail({
    email: user.email,
    subscriptionId,
  });

  if (freeSubscriptionStripeId) {
    try {
      await stripe.subscriptions.cancel(freeSubscriptionStripeId);
    } catch (error) {
      console.warn(
        `Could not cancel free subscription ${freeSubscriptionStripeId}:`,
        error,
      );
    }
  }

  return new Response(null);
};

const handleCheckoutSessionCompletedError = async (
  ctx: ActionCtx,
  event: Stripe.CheckoutSessionCompletedEvent,
) => {
  const session = event.data.object;

  const { customer: customerId, subscription: subscriptionId } = z
    .object({ customer: z.string(), subscription: z.string() })
    .parse(session);

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });
  if (!user || !user.email) throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);

  await sendSubscriptionErrorEmail({
    email: user.email,
    subscriptionId,
  });
  return new Response(null);
};

const handleCheckoutSessionAsyncPaymentFailed = async (
  ctx: ActionCtx,
  event: Stripe.CheckoutSessionAsyncPaymentFailedEvent,
) => {
  const session = event.data.object;

  const { customer: customerId, subscription: subscriptionId } = z
    .object({
      customer: z.string().nullable(),
      subscription: z.string().nullable(),
    })
    .parse(session);

  if (!customerId) {
    console.error("Checkout session async payment failed without customer ID.");
    return new Response(null);
  }

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });
  if (!user || !user.email) {
    return new Response(null);
  }

  // The subscription was not created, so no DB change is needed.
  // We just notify the user that their payment failed.
  await sendSubscriptionErrorEmail({
    email: user.email,
    subscriptionId: subscriptionId ?? "N/A",
  });

  return new Response(null);
};

const handleCustomerSubscriptionUpdated = async (
  ctx: ActionCtx,
  event: Stripe.CustomerSubscriptionUpdatedEvent,
) => {
  const subscription = await stripe.subscriptions.retrieve(
    event.data.object.id,
  );
  const customerId = subscription.customer as string;

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });
  if (!user) throw new Error(ERRORS.SOMETHING_WENT_WRONG);

  await handleUpdateSubscription(ctx, user, subscription);

  return new Response(null);
};

const handleCustomerSubscriptionUpdatedError = async (
  ctx: ActionCtx,
  event: Stripe.CustomerSubscriptionUpdatedEvent,
) => {
  const subscription = event.data.object;

  const { id: subscriptionId, customer: customerId } = z
    .object({ id: z.string(), customer: z.string() })
    .parse(subscription);

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });
  if (!user || !user.email) throw new Error(ERRORS.STRIPE_SOMETHING_WENT_WRONG);

  await sendSubscriptionErrorEmail({
    email: user.email,
    subscriptionId,
  });
  return new Response(null);
};

const handleCustomerSubscriptionDeleted = async (
  ctx: ActionCtx,
  event: Stripe.CustomerSubscriptionDeletedEvent,
) => {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  const user = await ctx.runQuery(internal.stripe.PREAUTH_getUserByCustomerId, {
    customerId,
  });

  if (!user) {
    console.warn(
      `Received 'customer.subscription.deleted' for unknown customer: ${customerId}`,
    );
    return new Response(null, { status: 404 });
  }

  // Idempotency: check if the subscription is already deleted from our side.
  if (user.subscription && user.subscription.stripeId === subscription.id) {
    await ctx.runMutation(internal.stripe.PREAUTH_deleteSubscription, {
      subscriptionStripeId: subscription.id,
    });
  }

  // Downgrade user by creating a new free subscription.
  await ctx.runAction(internal.stripe.PREAUTH_createFreeStripeSubscription, {
    userId: user._id,
    customerId,
    currency: (subscription.items.data[0].price.currency as Currency) ?? "usd",
  });

  return new Response(null);
};

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await getStripeEvent(request);

    try {
      switch (event.type) {
        /**
         * Occurs when a Checkout Session has been successfully completed.
         */
        case "checkout.session.completed": {
          return handleCheckoutSessionCompleted(ctx, event);
        }

        /**
         * Occurs when a payment fails for a Checkout Session.
         */
        case "checkout.session.async_payment_failed": {
          return handleCheckoutSessionAsyncPaymentFailed(ctx, event);
        }

        /**
         * Occurs whenever an invoice payment succeeds.
         */
        case "invoice.payment_succeeded": {
          return handleInvoicePaymentSucceeded(ctx, event);
        }

        /**
         * Occurs when a Stripe subscription has been updated.
         * E.g. when a user upgrades or downgrades their plan.
         */
        case "customer.subscription.updated": {
          return handleCustomerSubscriptionUpdated(ctx, event);
        }

        /**
         * Occurs whenever a customer’s subscription ends.
         */
        case "customer.subscription.deleted": {
          return handleCustomerSubscriptionDeleted(ctx, event);
        }
      }
    } catch (err: unknown) {
      switch (event.type) {
        case "checkout.session.completed": {
          return handleCheckoutSessionCompletedError(ctx, event);
        }

        case "customer.subscription.updated": {
          return handleCustomerSubscriptionUpdatedError(ctx, event);
        }
      }

      throw err;
    }

    return new Response(null);
  }),
});

auth.addHttpRoutes(http);

export default http;
