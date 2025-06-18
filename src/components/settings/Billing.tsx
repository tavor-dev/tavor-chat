import { api } from "@cvx/_generated/api";
import { toast, Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { Crown } from "lucide-react";
import { CreditCard } from "@medusajs/icons";
import { useState } from "react";

type PlanInterval = "month" | "year";

export function Billing() {
  const [selectedInterval, setSelectedInterval] =
    useState<PlanInterval>("month");
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const { data: plans } = useQuery(convexQuery(api.app.getActivePlans, {}));

  const createSubscriptionCheckout = useAction(
    api.stripe.createSubscriptionCheckout,
  );
  const createCustomerPortal = useAction(api.stripe.createCustomerPortal);

  const handleUpgrade = async () => {
    if (!user?._id || !plans?.pro) return;
    try {
      const url = await createSubscriptionCheckout({
        userId: user._id,
        planId: plans.pro._id,
        planInterval: selectedInterval,
        currency: "usd",
      });
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      toast.error("Failed to create checkout session.");
      console.error(e);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?._id) return;
    try {
      const url = await createCustomerPortal({ userId: user._id });
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      toast.error("Failed to create customer portal session.");
      console.error(e);
    }
  };

  const isPro = user?.subscription?.planKey === "pro";

  // Pricing data
  const monthlyPrice = 19;
  const yearlyPrice = 190;
  const yearlyDiscount = Math.round(
    ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100,
  );

  return (
    <div>
      <Heading level="h3" className="mb-4">
        Billing
      </Heading>

      {/* Current Plan */}
      <Container className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-ui-bg-subtle">
                {isPro ? (
                  <Crown className="h-4 w-4 text-ui-fg-muted" />
                ) : (
                  <CreditCard className="h-4 w-4 text-ui-fg-muted" />
                )}
              </div>
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-base mb-1"
                >
                  Current plan
                </Text>
                <div className="flex items-center gap-2">
                  <Badge size="small" color={isPro ? "purple" : "blue"}>
                    {isPro ? "PRO" : "Free"}
                  </Badge>
                  {isPro && (
                    <Text size="small" className="text-ui-fg-muted">
                      Unlimited messages
                    </Text>
                  )}
                </div>
              </div>
            </div>
            {isPro && (
              <Button
                onClick={handleManageSubscription}
                variant="secondary"
                size="small"
              >
                Manage
              </Button>
            )}
          </div>

          {/* Upgrade Section for Free Users */}
          {!isPro && (
            <div className="pt-4 border-t border-ui-border-base space-y-4">
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-base mb-1"
                >
                  Upgrade to Pro
                </Text>
                <Text size="small" className="text-ui-fg-muted mb-3">
                  Get unlimited messages and access to all AI models
                </Text>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center gap-4">
                <div className="bg-ui-bg-subtle rounded-lg p-1 flex items-center gap-1">
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      selectedInterval === "month"
                        ? "bg-ui-bg-base text-ui-fg-base shadow-sm"
                        : "text-ui-fg-muted hover:text-ui-fg-base"
                    }`}
                    onClick={() => setSelectedInterval("month")}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all relative flex gap-2 items-center ${
                      selectedInterval === "year"
                        ? "bg-ui-bg-base text-ui-fg-base shadow-sm"
                        : "text-ui-fg-muted hover:text-ui-fg-base"
                    }`}
                    onClick={() => setSelectedInterval("year")}
                  >
                    Yearly
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Text size="small" className="text-ui-fg-base font-medium">
                    $
                    {selectedInterval === "month"
                      ? monthlyPrice
                      : Math.round(yearlyPrice / 12)}
                    /month
                  </Text>
                  {selectedInterval === "year" && (
                    <>
                      <Text size="small" className="text-ui-fg-muted">
                        (${yearlyPrice}/year)
                      </Text>
                      <Text className="text-ui-tag-green-text">
                        {" "}
                        {yearlyDiscount}% off
                      </Text>
                    </>
                  )}
                </div>

                <Button onClick={handleUpgrade} size="small">
                  Upgrade
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
