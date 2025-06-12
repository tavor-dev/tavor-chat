import { Logo } from "@/components/logo";
import {
  FEATURE_CONFIGS,
  getAvailableModels,
  getDefaultModel,
  type ModelFeature,
  type ModelId,
} from "@/lib/models";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { Button, Select, Textarea } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/_app/_auth/")({
  component: NewChatComponent,
});

function NewChatComponent() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const navigate = useNavigate({ from: "/" });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.chat.streamAsynchronously);

  const updateUserPreferences = useMutation(api.account.updateUserPreferences);

  const selectedModel = user?.selectedModel ?? getDefaultModel("Free").id;
  const setSelectedModel = useCallback((selectedModel: ModelId) => {
    updateUserPreferences({ selectedModel });
  }, []);

  const [enabledFeatures, setEnabledFeatures] = useState<ModelFeature[]>([]);
  const [message, setMessage] = useState<string>("");

  // Get available models based on user plan (assuming free plan for now)
  const availableModels = getAvailableModels("Free");

  // Group models by provider
  const modelsByProvider = availableModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof availableModels>,
  );

  const getSelectedModelCapabilities = (): ModelFeature[] => {
    if (!selectedModel) return [];
    const model = availableModels.find((m) => m.id === selectedModel);
    return (
      model?.features.filter(
        (f) => FEATURE_CONFIGS[f].includeInModelSelector,
      ) || []
    );
  };

  const toggleFeature = (feature: ModelFeature) => {
    setEnabledFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    );
  };

  async function handleNewChat() {
    try {
      const threadId = await createThread({
        model: selectedModel || undefined,
      });
      await sendMessage({
        threadId,
        prompt: message,
        model: selectedModel || undefined,
      });
      navigate({ to: "/chat/$threadId", params: { threadId } });
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  }

  const availableCapabilities = getSelectedModelCapabilities();

  return (
    <div className="flex flex-1 flex-col h-screen p-8 justify-center">
      <div className="w-full flex justify-center flex-col items-center mb-8 gap-4">
        <Logo />
        {/* <Text className="text-xl font-mono"> */}
        {/*   What are you building cool today? */}
        {/* </Text> */}
      </div>
      {/* Main chat interface */}
      <div className="flex w-full justify-center">
        <div className="w-full bg-ui-bg-base rounded-2xl p-6 border border-ui-border-base max-w-3xl">
          {/* Model selector and features */}
          <div className="flex items-center gap-4 mb-6">
            {/* Speed/Model selector */}
            <div className="flex items-center gap-2">
              <div className="text-ui-tag-green-text text-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-ui-tag-green-icon rounded-full"></div>
                <div className="w-2 h-2 bg-ui-tag-green-icon rounded-full"></div>
                Speed
              </div>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value as ModelId)}
              >
                <Select.Trigger className="w-48 bg-ui-bg-field border-ui-border-base">
                  <Select.Value placeholder="Select a model" />
                </Select.Trigger>
                <Select.Content className="bg-ui-bg-component border-ui-border-base">
                  {Object.entries(modelsByProvider).map(
                    ([provider, models]) => (
                      <Select.Group key={provider}>
                        <Select.Label className="text-ui-fg-muted">
                          {provider}
                        </Select.Label>
                        {models.map((model) => (
                          <Select.Item
                            key={model.id}
                            value={model.id}
                            className="text-ui-fg-base hover:bg-ui-bg-component-hover"
                          >
                            {model.name}
                          </Select.Item>
                        ))}
                      </Select.Group>
                    ),
                  )}
                </Select.Content>
              </Select>
            </div>

            {/* Feature toggles */}
            {selectedModel && (
              <div className="flex gap-2">
                {availableCapabilities.map((feature) => {
                  const config = FEATURE_CONFIGS[feature];
                  const iconMap: Record<ModelFeature, string> = {
                    reasoning: "🧠",
                    search: "🌐",
                    images: "🖼️",
                    pdfs: "📄",
                    imageGeneration: "🎨",
                    parameters: "⚙️",
                    reasoningEffort: "💭",
                    fast: "⚡",
                  };
                  return (
                    <Button
                      key={feature}
                      variant={
                        enabledFeatures.includes(feature)
                          ? "primary"
                          : "secondary"
                      }
                      size="small"
                      onClick={() => toggleFeature(feature)}
                      className={`${
                        enabledFeatures.includes(feature)
                          ? "bg-ui-bg-interactive hover:bg-ui-bg-highlight-hover text-ui-fg-on-color"
                          : "bg-ui-button-neutral hover:bg-ui-button-neutral-hover text-ui-fg-base"
                      } flex items-center gap-1`}
                      title={config.description}
                    >
                      {iconMap[feature]} {config.name}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="relative">
            <Textarea
              placeholder="Ask a question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-ui-bg-field border-ui-border-base text-ui-fg-base placeholder-ui-fg-muted resize-none min-h-[120px] pr-12 hover:bg-ui-bg-field-hover focus:border-ui-border-interactive"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim() && selectedModel) {
                    handleNewChat();
                  }
                }
              }}
            />

            {/* Send button */}
            <Button
              onClick={handleNewChat}
              disabled={!message.trim() || !selectedModel}
              className="absolute bottom-3 right-3 w-8 h-8 p-0 bg-ui-button-neutral hover:bg-ui-button-neutral-hover disabled:bg-ui-bg-disabled disabled:cursor-not-allowed text-ui-fg-base"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </Button>
          </div>

          {/* Model info */}
          {selectedModel && (
            <div className="mt-4 text-sm text-ui-fg-muted">
              {selectedModel && (
                <>
                  Selected:{" "}
                  {availableModels.find((m) => m.id === selectedModel)?.name}
                  {enabledFeatures.length > 0 && (
                    <span className="ml-2">
                      • Features:{" "}
                      {enabledFeatures
                        .map((f) => FEATURE_CONFIGS[f].name)
                        .join(", ")}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
