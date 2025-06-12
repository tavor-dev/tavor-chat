export const MODEL_IDS = [
  "gpt-4o-mini",
  "gpt-4o",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-4-sonnet",
  "claude-4-opus",
  "gemini-2-0-flash",
  "gemini-2-5-flash",
  "gemini-2-5-pro",
  "deepseek-chat",
  "deepseek-r1",
  "llama-3-3-70b",
  "mixtral-8x7b",
  "qwen-2-5-72b",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const DEFAULT_MODEL_ID: ModelId = "gpt-4o-mini";

export const MODEL_FEATURES = [
  "fast",
  "images",
  "search",
  "pdfs",
  "parameters",
  "reasoning",
  "reasoningEffort",
  "imageGeneration",
] as const;

export type ModelFeature = (typeof MODEL_FEATURES)[number];

export interface ModelFeatureConfig {
  id: ModelFeature;
  name: string;
  description: string;
  icon?: (props: { className?: string }) => React.ReactNode;
  color?: string;
  includeInModelSelector: boolean;
}

export const FEATURE_CONFIGS: Record<ModelFeature, ModelFeatureConfig> = {
  images: {
    id: "images",
    name: "Vision",
    description: "Supports image uploads and analysis",
    color: "silver",
    includeInModelSelector: true,
  },
  pdfs: {
    id: "pdfs",
    name: "PDFs",
    description: "Supports PDF uploads and analysis",
    color: "silver",
    includeInModelSelector: true,
  },
  parameters: {
    id: "parameters",
    name: "Model Parameters",
    description: "Customize temperature, top_p and other model settings",
    includeInModelSelector: false,
  },
  fast: {
    id: "fast",
    name: "Fast",
    description: "Very fast model",
    color: "yellow",
    includeInModelSelector: false,
  },
  reasoning: {
    id: "reasoning",
    name: "Reasoning",
    description: "Has reasoning capabilities",
    color: "purple",
    includeInModelSelector: true,
  },
  reasoningEffort: {
    id: "reasoningEffort",
    name: "Effort Control",
    description: "Customize the model's reasoning effort level",
    color: "pink",
    includeInModelSelector: false,
  },
  search: {
    id: "search",
    name: "Search",
    description: "Uses search to answer questions",
    color: "blue",
    includeInModelSelector: true,
  },
  imageGeneration: {
    id: "imageGeneration",
    name: "Image Generation",
    description: "Can generate images",
    color: "green",
    includeInModelSelector: true,
  },
};

export interface ModelConfig {
  id: ModelId;
  name: string;
  provider: string;
  developer: string;
  addedOn: Date;
  shortDescription: string;
  fullDescription: string;
  requiresPro: boolean;
  disabled: boolean;
  premium: boolean;
  modelPickerDefault: boolean;
  limits: {
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  features: ModelFeature[];
  experimental?: boolean;
  apiKeySupport?: "optional" | "required";
  statuspage?: {
    url: string;
    apiUrl: string;
  };
  streamChunking?: "line" | "word";
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    developer: "OpenAI",
    addedOn: new Date("2024-07-18"),
    shortDescription: "Faster, less precise GPT-4o",
    fullDescription:
      "Like GPT-4o, but faster. This model sacrifices some of the original GPT-4o's precision for significantly reduced latency. It accepts both text and image inputs.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters", "fast"],
    experimental: false,
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    developer: "OpenAI",
    addedOn: new Date("2024-05-13"),
    shortDescription: "OpenAI's flagship; versatile and intelligent",
    fullDescription:
      "OpenAI's flagship non-reasoning model. Works with text and images. Relatively smart. Good at most things.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters"],
    experimental: false,
  },
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    developer: "Anthropic",
    addedOn: new Date("2024-06-20"),
    shortDescription: "Anthropic's flagship model",
    fullDescription:
      "Smart model for complex problems. Known for being good at code and math. Also kind of slow and expensive.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
    },
    features: ["images", "pdfs", "parameters"],
    statuspage: {
      url: "https://status.anthropic.com",
      apiUrl: "https://status.anthropic.com/api/v2/status.json",
    },
    experimental: false,
    apiKeySupport: "optional",
  },
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    developer: "Anthropic",
    addedOn: new Date("2024-11-04"),
    shortDescription: "Fast and affordable Claude model",
    fullDescription:
      "Claude 3.5 Haiku is the fastest and most affordable model in the Claude 3.5 family. It's optimized for speed while maintaining strong performance on many tasks.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 8192,
    },
    features: ["images", "parameters", "fast"],
    statuspage: {
      url: "https://status.anthropic.com",
      apiUrl: "https://status.anthropic.com/api/v2/status.json",
    },
    experimental: false,
    apiKeySupport: "optional",
  },
  "claude-4-sonnet": {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    developer: "Anthropic",
    addedOn: new Date("2025-05-22"),
    shortDescription: "Anthropic's latest model",
    fullDescription:
      "The latest model from Anthropic. Claude Sonnet 4 is a significant upgrade to Claude Sonnet 3.5, delivering superior coding and reasoning while responding more precisely to your instructions.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 16384,
    },
    features: ["images", "pdfs", "parameters", "reasoning"],
    statuspage: {
      url: "https://status.anthropic.com",
      apiUrl: "https://status.anthropic.com/api/v2/status.json",
    },
    experimental: false,
    apiKeySupport: "optional",
  },
  "claude-4-opus": {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    provider: "Anthropic",
    developer: "Anthropic",
    addedOn: new Date("2025-05-22"),
    shortDescription: "Anthropic's most powerful model",
    fullDescription:
      "The latest and greatest from Anthropic. Very powerful, but with a cost to match.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 16384,
    },
    features: ["images", "pdfs", "parameters", "reasoning"],
    statuspage: {
      url: "https://status.anthropic.com",
      apiUrl: "https://status.anthropic.com/api/v2/status.json",
    },
    experimental: false,
    apiKeySupport: "required",
  },
  "gemini-2-0-flash": {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    developer: "Google",
    addedOn: new Date("2024-12-11"),
    shortDescription: "Google's fast multimodal model",
    fullDescription:
      "Google's flagship model, known for speed and accuracy. Not quite as smart as Claude 3.5 Sonnet, but WAY faster and cheaper. Also has an insanely large context window.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
    },
    streamChunking: "word",
    features: ["images", "pdfs", "search", "fast"],
    experimental: false,
    apiKeySupport: "optional",
  },
  "gemini-2-5-flash": {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    developer: "Google",
    addedOn: new Date("2025-04-17"),
    shortDescription: "Google's latest fast model",
    fullDescription:
      "Google's latest fast model, known for speed and accuracy (and also web search!). Not quite as smart as Claude 3.5 Sonnet, but WAY faster and cheaper. Also has an insanely large context window.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 65535,
    },
    streamChunking: "word",
    features: ["images", "pdfs", "search", "fast"],
    experimental: false,
    apiKeySupport: "optional",
  },
  "gemini-2-5-pro": {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    developer: "Google",
    addedOn: new Date("2025-03-25"),
    shortDescription: "Google's most advanced model",
    fullDescription:
      "Google's most advanced model, excelling at complex reasoning and problem-solving. Particularly strong at tackling difficult code challenges, mathematical proofs, and STEM problems.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 64000,
    },
    streamChunking: "word",
    features: [
      "parameters",
      "images",
      "pdfs",
      "search",
      "reasoning",
      "reasoningEffort",
    ],
    experimental: false,
    apiKeySupport: "optional",
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    developer: "DeepSeek",
    addedOn: new Date("2024-12-26"),
    shortDescription: "DeepSeek's chat model",
    fullDescription:
      "DeepSeek's groundbreaking direct prediction model. Comparable performance to Claude 3.5 Sonnet. Just... slow.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["parameters"],
    experimental: false,
  },
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    developer: "DeepSeek",
    addedOn: new Date("2025-01-20"),
    shortDescription: "DeepSeek's reasoning model",
    fullDescription:
      "The open source reasoning model that shook the whole industry. Very smart. Shows all of its thinking. Not the fastest.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["parameters", "reasoning"],
    experimental: false,
  },
  "llama-3-3-70b": {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    developer: "Meta",
    addedOn: new Date("2024-12-06"),
    shortDescription: "Fast open-source model",
    fullDescription:
      "Industry-leading speed in an open source model. Not the smartest, but unbelievably fast.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 32768,
    },
    streamChunking: "line",
    features: ["parameters", "fast"],
    experimental: false,
  },
  "mixtral-8x7b": {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "Mistral",
    developer: "Mistral",
    addedOn: new Date("2023-12-11"),
    shortDescription: "Efficient mixture-of-experts model",
    fullDescription:
      "A sparse mixture-of-experts model that outperforms Llama 2 70B on most benchmarks with 6x faster inference.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 32768,
      maxOutputTokens: 32768,
    },
    features: ["parameters", "fast"],
    experimental: false,
  },
  "qwen-2-5-72b": {
    id: "qwen-2-5-72b",
    name: "Qwen 2.5 72B",
    provider: "Alibaba",
    developer: "Alibaba",
    addedOn: new Date("2024-09-19"),
    shortDescription: "Powerful open-source model",
    fullDescription:
      "Alibaba's Qwen 2.5 is a powerful open-source model that excels at coding, mathematics, and multilingual tasks.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 8000,
    },
    features: ["parameters"],
    experimental: false,
  },
};

export function isModelAvailable(
  modelId: ModelId,
  userPlan: "Free" | "Pro" | "Premium" = "Free",
  apiCredits: number = 0,
): boolean {
  const model = MODEL_CONFIGS[modelId];
  if (!model) return false;

  if (model.disabled) return false;

  if (!model.requiresPro) return true;

  if (userPlan === "Pro" || userPlan === "Premium") return true;

  if (apiCredits > 0) return true;

  return false;
}

export function getAvailableModels(
  userPlan: "Free" | "Pro" | "Premium" = "Free",
  apiCredits: number = 0,
): ModelConfig[] {
  return MODEL_IDS.filter((id) =>
    isModelAvailable(id, userPlan, apiCredits),
  ).map((id) => MODEL_CONFIGS[id]);
}

export function getModelsByFeature(feature: ModelFeature): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((model) =>
    model.features.includes(feature),
  );
}

export function getDefaultModel(
  userPlan: "Free" | "Pro" | "Premium" = "Free",
): ModelConfig {
  const availableModels = getAvailableModels(userPlan);
  const defaultModel = availableModels.find((m) => m.modelPickerDefault);
  return defaultModel || availableModels[0] || MODEL_CONFIGS[DEFAULT_MODEL_ID];
}
