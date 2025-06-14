import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { Heading, Tabs, Text, Avatar, Badge, Container } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ThemeSwitcher } from "@/ui/theme-switcher";
import { User, Mail, Calendar, Sparkles } from "lucide-react";
import { getAvailableModels, getDefaultModel } from "@/lib/models";
import { Billing } from "@/components/settings/Billing";

export const Route = createFileRoute("/_app/_auth/settings/_layout")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // This would ideally come from the user object or other app state
  const userPlan = "Free";
  const availableModels = getAvailableModels(userPlan);
  const defaultModel = getDefaultModel(userPlan);

  const selectedModelId = user?.selectedModel ?? defaultModel.id;
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-8 pt-12 px-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <Heading>Settings</Heading>
      </div>
      <div className="w-full">
        <Tabs
          defaultValue="account"
          orientation="vertical"
          className="sm:tabs-horizontal tabs-vertical"
        >
          <Tabs.List className="flex flex-col sm:flex-row">
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="theme">Theme</Tabs.Trigger>
          </Tabs.List>
          <div className="mt-2">
            <Tabs.Content value="account" className="mt-6">
              <div className="space-y-8">
                <div>
                  <Heading level="h3" className="mb-4">
                    Profile Information
                  </Heading>
                  <Container className="p-6 space-y-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 pb-4 border-b border-ui-border-base">
                      <Avatar
                        src={user?.image || user?.avatarUrl}
                        fallback={
                          user?.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "U"
                        }
                        className="h-16 w-16"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Heading level="h3" className="text-ui-fg-base">
                            {user?.name || "User"}
                          </Heading>
                          {/* {user?.emailVerificationTime && (
                            <Badge size="small" color="green">
                              Verified
                            </Badge>
                          )} */}
                        </div>
                        <Text size="small" className="text-ui-fg-muted">
                          {user?.email}
                        </Text>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-ui-bg-subtle">
                            <User className="h-4 w-4 text-ui-fg-muted" />
                          </div>
                          <div>
                            <Text
                              size="small"
                              weight="plus"
                              className="text-ui-fg-base mb-1"
                            >
                              Full name
                            </Text>
                            <Text size="small" className="text-ui-fg-muted">
                              {user?.name || "Not provided"}
                            </Text>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-ui-bg-subtle">
                            <Mail className="h-4 w-4 text-ui-fg-muted" />
                          </div>
                          <div>
                            <Text
                              size="small"
                              weight="plus"
                              className="text-ui-fg-base mb-1"
                            >
                              Email address
                            </Text>
                            <Text size="small" className="text-ui-fg-muted">
                              {user?.email || "Not provided"}
                            </Text>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-ui-bg-subtle">
                            <Sparkles className="h-4 w-4 text-ui-fg-muted" />
                          </div>
                          <div>
                            <Text
                              size="small"
                              weight="plus"
                              className="text-ui-fg-base mb-1"
                            >
                              Preferred model
                            </Text>
                            <div className="flex items-center gap-2">
                              <Text size="small" className="text-ui-fg-muted">
                                {selectedModel?.name ?? "Default"}
                              </Text>
                              {selectedModel && (
                                <Badge size="small" color="purple">
                                  {selectedModel.provider}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-ui-bg-subtle">
                            <Calendar className="h-4 w-4 text-ui-fg-muted" />
                          </div>
                          <div>
                            <Text
                              size="small"
                              weight="plus"
                              className="text-ui-fg-base mb-1"
                            >
                              Account created
                            </Text>
                            <Text size="small" className="text-ui-fg-muted">
                              {user?._creationTime
                                ? formatDate(user._creationTime)
                                : "Unknown"}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Verification Status */}
                    {user?.emailVerificationTime && (
                      <div className="pt-4 border-t border-ui-border-base">
                        <div className="flex items-center justify-between">
                          <div>
                            <Text
                              size="small"
                              weight="plus"
                              className="text-ui-fg-base mb-1"
                            >
                              Email verified
                            </Text>
                            <Text size="small" className="text-ui-fg-muted">
                              Verified on{" "}
                              {formatDate(user.emailVerificationTime)}
                            </Text>
                          </div>
                          <Badge color="green">Verified</Badge>
                        </div>
                      </div>
                    )}
                  </Container>
                </div>

                <Billing />
              </div>
            </Tabs.Content>

            <Tabs.Content value="theme" className="mt-6">
              <div>
                <Heading level="h3" className="mb-4">
                  Appearance
                </Heading>
                <Container className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Text
                        size="small"
                        weight="plus"
                        className="text-ui-fg-base mb-2"
                      >
                        Theme preference
                      </Text>
                      <Text size="small" className="text-ui-fg-muted mb-4">
                        Choose your preferred theme for the application
                        interface.
                      </Text>
                      <ThemeSwitcher />
                    </div>
                  </div>
                </Container>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
