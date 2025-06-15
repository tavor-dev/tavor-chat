import { Container, Heading, Text, Badge } from "@medusajs/ui";
import { Progress } from "@/ui/progress";
import { MessageSquare, TrendingUp, Calendar, Zap } from "lucide-react";

interface UsageStatsProps {
  userPlan?: string;
}

export function UsageStats({ userPlan = "Free" }: UsageStatsProps) {
  // Mock data - this would come from your actual usage tracking
  const usageData = {
    Free: {
      messagesUsed: 847,
      messagesLimit: 1000,
      resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      dailyAverage: 28,
      peakDay: 45,
    },
    Pro: {
      messagesUsed: 2340,
      messagesLimit: 5000,
      resetDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
      dailyAverage: 75,
      peakDay: 120,
    },
    Enterprise: {
      messagesUsed: 8750,
      messagesLimit: null, // Unlimited
      resetDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
      dailyAverage: 280,
      peakDay: 450,
    },
  };

  const stats = usageData[userPlan as keyof typeof usageData] || usageData.Free;
  const usagePercentage = stats.messagesLimit
    ? (stats.messagesUsed / stats.messagesLimit) * 100
    : 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
                <div className="flex items-center gap-2">
                  <Text size="small" className="text-ui-fg-muted">
                    {stats.messagesUsed.toLocaleString()}
                    {stats.messagesLimit && (
                      <span> of {stats.messagesLimit.toLocaleString()}</span>
                    )}
                    {!stats.messagesLimit && <span> (Unlimited)</span>}
                  </Text>
                  <Badge
                    size="small"
                    color={
                      userPlan === "Free"
                        ? "blue"
                        : userPlan === "Pro"
                          ? "purple"
                          : "orange"
                    }
                  >
                    {userPlan}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar (only show for plans with limits) */}
          {stats.messagesLimit && (
            <div className="space-y-2">
              <Progress
                value={usagePercentage}
                className="w-full"
                color={getUsageColor(usagePercentage)}
              />
              <div className="flex justify-between text-xs text-ui-fg-muted">
                <span>{usagePercentage.toFixed(1)}% used</span>
                <span>
                  {(stats.messagesLimit - stats.messagesUsed).toLocaleString()}{" "}
                  remaining
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Usage Details Grid */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-ui-border-base"> */}
        {/*   <div className="flex items-start gap-3"> */}
        {/*     <div className="p-2 rounded-lg bg-ui-bg-subtle"> */}
        {/*       <TrendingUp className="h-4 w-4 text-ui-fg-muted" /> */}
        {/*     </div> */}
        {/*     <div> */}
        {/*       <Text size="small" weight="plus" className="text-ui-fg-base mb-1"> */}
        {/*         Daily average */}
        {/*       </Text> */}
        {/*       <Text size="small" className="text-ui-fg-muted"> */}
        {/*         {stats.dailyAverage} messages */}
        {/*       </Text> */}
        {/*     </div> */}
        {/*   </div> */}
        {/**/}
        {/*   <div className="flex items-start gap-3"> */}
        {/*     <div className="p-2 rounded-lg bg-ui-bg-subtle"> */}
        {/*       <Zap className="h-4 w-4 text-ui-fg-muted" /> */}
        {/*     </div> */}
        {/*     <div> */}
        {/*       <Text size="small" weight="plus" className="text-ui-fg-base mb-1"> */}
        {/*         Peak day */}
        {/*       </Text> */}
        {/*       <Text size="small" className="text-ui-fg-muted"> */}
        {/*         {stats.peakDay} messages */}
        {/*       </Text> */}
        {/*     </div> */}
        {/*   </div> */}
        {/**/}
        {/*   <div className="flex items-start gap-3"> */}
        {/*     <div className="p-2 rounded-lg bg-ui-bg-subtle"> */}
        {/*       <Calendar className="h-4 w-4 text-ui-fg-muted" /> */}
        {/*     </div> */}
        {/*     <div> */}
        {/*       <Text size="small" weight="plus" className="text-ui-fg-base mb-1"> */}
        {/*         Resets on */}
        {/*       </Text> */}
        {/*       <Text size="small" className="text-ui-fg-muted"> */}
        {/*         {formatDate(stats.resetDate)} */}
        {/*       </Text> */}
        {/*     </div> */}
        {/*   </div> */}
        {/* </div> */}

        {/* Usage Warning/Info */}
        {stats.messagesLimit && usagePercentage >= 90 && (
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
                  message limit. Consider upgrading your plan to avoid
                  interruptions.
                </Text>
              </div>
            </div>
          </div>
        )}

        {stats.messagesLimit &&
          usagePercentage >= 75 &&
          usagePercentage < 90 && (
            <div className="p-4 rounded-lg bg-ui-tag-red-bg border border-ui-tag-red-border">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-ui-tag-red-text mt-0.5" />
                <div>
                  <Text
                    size="small"
                    weight="plus"
                    className="text-ui-tag-red-text mb-1"
                  >
                    High usage detected
                  </Text>
                  <Text size="small" className="text-ui-tag-red-text">
                    You're at {usagePercentage.toFixed(1)}% of your monthly
                    limit with{" "}
                    {Math.ceil(
                      (stats.resetDate.getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000),
                    )}{" "}
                    days remaining.
                  </Text>
                </div>
              </div>
            </div>
          )}
      </Container>
    </div>
  );
}
