import { Progress } from "@/ui/progress";
import { api } from "@cvx/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { Badge, Container, Heading, Text } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MessageSquare } from "lucide-react";

export function UsageStats() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const userPlan = user?.subscription?.planKey ?? "free";
  const messagesUsed = user?.messageCount ?? 0;
  // NOTE: This should be kept in sync with the backend value in `convex/account.ts`
  const messagesLimit = 50;
  const usageResetTime = user?.usageResetTime;

  const usagePercentage = messagesLimit
    ? (messagesUsed / messagesLimit) * 100
    : 0;

  if (!user) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "red";
    if (percentage >= 75) return "red";
    if (percentage >= 50) return "yellow";
    return "green";
  };

  return (
    <div>
      <Heading level="h3" className="mb-4">
        Usage
      </Heading>
      <Container className="p-6 space-y-6">
        {/* Main Usage Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-ui-bg-subtle">
                <MessageSquare className="h-4 w-4 text-ui-fg-muted" />
              </div>
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-base mb-1"
                >
                  Messages this cycle
                </Text>
                <div className="flex items-baseline gap-2">
                  {userPlan === "pro" ? (
                    <Text size="small" className="text-ui-fg-muted">
                      Unlimited
                    </Text>
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">
                      {messagesUsed.toLocaleString()}
                      {messagesLimit && (
                        <span> / {messagesLimit.toLocaleString()}</span>
                      )}
                    </Text>
                  )}
                  <Badge
                    size="small"
                    color={
                      userPlan === "free"
                        ? "blue"
                        : userPlan === "pro"
                          ? "purple"
                          : "orange"
                    }
                  >
                    {userPlan.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar (only show for plans with limits) */}
          {userPlan !== "pro" && messagesLimit && (
            <div className="space-y-2">
              <Progress
                value={usagePercentage}
                className="w-full"
                color={getUsageColor(usagePercentage)}
              />
              <div className="flex justify-between text-xs text-ui-fg-muted">
                <span>{usagePercentage.toFixed(1)}% used</span>
                <span>
                  {(messagesLimit - messagesUsed).toLocaleString()} remaining
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-start gap-3 pt-4 border-t border-ui-border-base">
          <div className="p-2 rounded-lg bg-ui-bg-subtle">
            <Calendar className="h-4 w-4 text-ui-fg-muted" />
          </div>
          <div>
            <Text size="small" weight="plus" className="text-ui-fg-base mb-1">
              {userPlan === "pro" ? "No reset, unlimited usage" : "Resets on"}
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              {userPlan === "pro"
                ? "Enjoy unlimited messages with your Pro plan."
                : usageResetTime
                  ? formatDate(usageResetTime)
                  : "N/A"}
            </Text>
          </div>
        </div>

        {/* Usage Warning/Info */}
        {userPlan !== "pro" && messagesLimit && usagePercentage >= 90 && (
          <div className="p-4 rounded-lg bg-ui-tag-red-bg border border-ui-tag-red-border">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-ui-tag-red-text mt-0.5" />
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-tag-red-text mb-1"
                >
                  Usage limit approaching
                </Text>
                <Text size="small" className="text-ui-tag-red-text">
                  You've used {usagePercentage.toFixed(1)}% of your monthly
                  message limit. Consider upgrading to avoid interruptions.
                </Text>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
