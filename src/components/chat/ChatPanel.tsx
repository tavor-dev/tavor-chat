import { cn } from "@/lib/utils";
import { ArrowUp, Square } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useCallback, useState } from "react";
import { Button, Select } from "@medusajs/ui";
import TextareaAutosize, {
  type TextareaHeightChangeMeta,
} from "react-textarea-autosize";
import {
  AiAssistent,
  GlobeEurope,
  Photo,
  DocumentText,
  Sparkles,
  CogSixTooth,
  LightBulb,
  Bolt,
} from "@medusajs/icons";
import {
  FEATURE_CONFIGS,
  getAvailableModels,
  getDefaultModel,
  type ModelFeature,
  type ModelId,
} from "@/lib/models";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";

interface ChatPanelProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onInputHeightChange: (height: number, meta: TextareaHeightChangeMeta) => void;
  isLoading: boolean;
  showScrollToBottomButton: boolean;
  onScrollToBottom?: () => void; // Added this prop
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  onInputHeightChange,
  showScrollToBottomButton,
  onScrollToBottom, // Added this prop
}: ChatPanelProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const updateUserPreferences = useMutation(api.account.updateUserPreferences);

  const selectedModel = user?.selectedModel ?? getDefaultModel("Free").id;
  const setSelectedModel = useCallback(
    (selectedModel: ModelId) => {
      updateUserPreferences({ selectedModel });
    },
    [updateUserPreferences],
  );

  const [enabledFeatures, setEnabledFeatures] = useState<ModelFeature[]>([]);

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

  const handleNewChat = () => {
    navigate({ to: "/" });
  };

  const handleScrollToBottom = () => {
    if (onScrollToBottom) {
      onScrollToBottom();
    }
  };

  return (
    <div
      className={cn(
        "w-full group/form-container absolute bottom-0 z-0 px-2 pb-2",
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn("max-w-3xl w-full mx-auto relative")}
      >
        {showScrollToBottomButton && (
          <Button
            type="button"
            variant="transparent"
            size="small"
            className="absolute -top-10 right-4 z-20 size-8 rounded-full shadow-md hover:bg-ui-bg-component-hover"
            onClick={handleScrollToBottom}
            title="Scroll to bottom"
          >
            ↓
          </Button>
        )}

        <div className="relative flex flex-col w-full gap-2 bg-ui-bg-field-component rounded-xl border border-ui-border-base z-50">
          <TextareaAutosize
            onHeightChange={onInputHeightChange}
            ref={inputRef}
            name="input"
            rows={2}
            tabIndex={0}
            placeholder="Ask a question..."
            spellCheck={false}
            value={input}
            disabled={isLoading}
            className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-sm placeholder:text-ui-fg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-ui-fg-base max-h-64"
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                if (input.trim().length === 0) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                const textarea = e.target as HTMLTextAreaElement;
                textarea.form?.requestSubmit();
              }
            }}
          />

          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {/* Model selector */}
              <div className="flex items-center gap-2">
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
            </div>
            <div className="flex items-center gap-2">
              <Button
                type={isLoading ? "button" : "submit"}
                className={cn(
                  isLoading && "animate-pulse",
                  "",
                  input.length === 0 && !isLoading && "",
                )}
                disabled={input.length === 0 && !isLoading}
              >
                {isLoading ? <Square size={20} /> : <ArrowUp size={20} />}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
