import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import {
  Heading,
  Tabs,
  Text,
  Avatar,
  Badge,
  Container,
  Textarea,
  Label,
  RadioGroup,
  Button,
} from "@medusajs/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ThemeSwitcher } from "@/ui/theme-switcher";
import { User, Mail, Calendar, Sparkles } from "lucide-react";
import { getAvailableModels, getDefaultModel } from "@/lib/models";
import { Billing } from "@/components/settings/Billing";
import { UsageStats } from "@/components/settings/UsageStats";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const VALID_TABS = ["account", "usage", "billing", "theme"] as const;
type SettingsSearchTab = (typeof VALID_TABS)[number];

type SettingsSearch = {
  tab: SettingsSearchTab;
};

const validateSearchTab = (tab: unknown): SettingsSearchTab => {
  const defaultTab = VALID_TABS[0];
  if (!tab || typeof tab !== "string") return defaultTab;
  if (!VALID_TABS.includes(tab as unknown as SettingsSearchTab))
    return defaultTab;

  return tab as SettingsSearchTab;
};

export const Route = createFileRoute("/_app/_auth/settings/_layout")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab: validateSearchTab(search.tab),
  }),
});

function RouteComponent() {
  const convex = useConvex();
  const { data: user, refetch } = useQuery(
    convexQuery(api.app.getCurrentUser, {}),
  );
  const navigate = useNavigate({ from: Route.fullPath });
  const { tab } = Route.useSearch();

  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [systemPromptMode, setSystemPromptMode] = useState<
    "enhance" | "replace" | undefined
  >();

  const updateSettings = useMutation({
    mutationFn: (args: {
      customSystemPrompt?: string;
      systemPromptMode?: "enhance" | "replace";
    }) => convex.mutation(api.account.updateSystemPromptSettings, args),
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      refetch();
    },
    onError: (err: Error) => {
      toast.error(`Error updating settings: ${err.message}`);
    },
  });

  useEffect(() => {
    if (user) {
      setCustomSystemPrompt(user.customSystemPrompt ?? "");
      setSystemPromptMode(user.systemPromptMode);
    }
  }, [user]);

  const handleSaveSystemPrompt = () => {
    updateSettings.mutate({
      customSystemPrompt,
      systemPromptMode,
    });
  };

  const isSystemPromptDirty =
    customSystemPrompt !== (user?.customSystemPrompt ?? "") ||
    systemPromptMode !== user?.systemPromptMode;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleTabChange = (newTab: string) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: newTab }),
      replace: true,
    });
  };

  const userPlan = user?.subscription?.planKey || "free";
  const availableModels = getAvailableModels(userPlan);
  const defaultModel = getDefaultModel(userPlan);

  const selectedModelId = user?.selectedModel ?? defaultModel.id;
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-8 pt-12 px-6 w-full h-screen overflow-auto">
      <div className="flex justify-between items-center">
        <Heading>Settings</Heading>
      </div>
      <div className="w-full">
        <Tabs
          value={tab}
          onValueChange={handleTabChange}
          orientation="vertical"
          className="sm:tabs-horizontal tabs-vertical mb-4"
        >
          <Tabs.List className="flex flex-col sm:flex-row">
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="usage">Usage</Tabs.Trigger>
            <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
            <Tabs.Trigger value="theme">Theme</Tabs.Trigger>
          </Tabs.List>
          <div className="mt-2">
            <Tabs.Content value="account" className="mt-6">
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  <div className="xl:col-span-3">
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

                  <div className="xl:col-span-3">
                    <Heading level="h3" className="mb-4">
                      Custom system prompt
                    </Heading>
                    <Container className="p-6 space-y-6">
                      <Text size="small" className="text-ui-fg-muted">
                        Customize the behavior of the assistant by providing a
                        custom system prompt. You can either enhance the default
                        prompt or replace it entirely.
                      </Text>

                      <div>
                        <Label htmlFor="custom-prompt">Custom prompt</Label>
                        <Textarea
                          id="custom-prompt"
                          value={customSystemPrompt}
                          onChange={(e) =>
                            setCustomSystemPrompt(e.target.value)
                          }
                          placeholder="e.g., You are a helpful assistant that always replies in pirate speech."
                          className="h-20"
                        />
                      </div>

                      <div>
                        <Label>Mode</Label>
                        <RadioGroup
                          value={systemPromptMode ?? ""}
                          onValueChange={(v) =>
                            setSystemPromptMode(v as "enhance" | "replace")
                          }
                          className="mt-2 flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value="enhance" id="enhance" />
                            <Label htmlFor="enhance">Enhance</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroup.Item value="replace" id="replace" />
                            <Label htmlFor="replace">Replace</Label>
                          </div>
                        </RadioGroup>
                        <Text size="small" className="text-ui-fg-subtle mt-1">
                          'Enhance' adds your prompt to the default. 'Replace'
                          uses only your prompt.
                        </Text>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-ui-border-base">
                        <Button
                          onClick={handleSaveSystemPrompt}
                          disabled={
                            !isSystemPromptDirty || updateSettings.isPending
                          }
                          isLoading={updateSettings.isPending}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </Container>
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="usage" className="mt-6">
              <UsageStats />
            </Tabs.Content>

            <Tabs.Content value="billing" className="mt-6">
              <Billing />
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
