import { api } from "@cvx/_generated/api";
import { toast, Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { Check } from "lucide-react";

export function Billing() {
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
        planInterval: "month", // Default to monthly, can add a selector
        currency: "usd", // Default to USD, can be dynamic
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
  const planName = isPro ? "Pro" : "Free";
  const planDescription = isPro
    ? "You have full access to all features."
    : "You are currently on the Free plan. Upgrade for higher limits and access to premium models.";

  return (
    <div>
      <Heading level="h3" className="mb-4">
        Billing & Plan
      </Heading>
      <Container className="p-6" id="billing">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Heading level="h3">Your plan</Heading>
              <Badge color={isPro ? "purple" : "blue"}>{planName}</Badge>
            </div>
            <Text size="small" className="text-ui-fg-muted">
              {planDescription}
            </Text>
            <ul className="space-y-2 text-sm text-ui-fg-subtle">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>
                  {isPro ? "Access to all models" : "Access to standard models"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>{isPro ? "Unlimited messages" : "Limited messages"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ui-fg-interactive" />
                <span>{isPro ? "Priority support" : "Community support"}</span>
              </li>
            </ul>
          </div>
          <div className="md:w-auto">
            {isPro ? (
              <Button onClick={handleManageSubscription} variant="secondary">
                Manage subscription
              </Button>
            ) : (
              <Button onClick={handleUpgrade} variant="primary">
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
