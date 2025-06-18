import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { type LanguageModelV1 } from "ai";

export const MODEL_IDS = [
  "gpt-4o-mini",
  "gpt-4o",
  "o3",
  "o3-mini",
  "o4-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-7-sonnet",
  "claude-4-sonnet",
  "gemini-2-0-flash",
  "gemini-2-5-flash",
  "gemini-2-5-pro",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export const DEFAULT_MODEL_ID: ModelId = "gemini-2-5-flash";

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
  runtime: LanguageModelV1;
  provider: string;
  developer: string;
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
  statuspage?: {
    url: string;
    apiUrl: string;
  };
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Swift and efficient GPT-4o variant",
    fullDescription:
      "A streamlined version of GPT-4o optimized for rapid response times. Trades a bit of accuracy for impressive speed gains while maintaining multimodal capabilities.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters", "fast"],
    runtime: openai("gpt-4o-mini"),
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "OpenAI's premier all-purpose model",
    fullDescription:
      "The crown jewel of OpenAI's standard offerings. Handles text and visual inputs with finesse. Well-rounded intelligence across diverse tasks.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters"],
    runtime: openai("gpt-4o"),
  },
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    developer: "Anthropic",
    shortDescription: "Anthropic's powerhouse performer",
    fullDescription:
      "Exceptional at tackling intricate challenges. Particularly strong in programming and mathematical domains. Premium performance comes with higher latency and cost.",
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
    runtime: anthropic("claude-3-5-sonnet-latest"),
  },
  "claude-3-5-haiku": {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    developer: "Anthropic",
    shortDescription: "Lightning-quick Claude variant",
    fullDescription:
      "The speedster of the Claude 3.5 lineup. Engineered for blazing-fast responses without breaking the bank, while still delivering solid results across various applications.",
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
    runtime: anthropic("claude-3-5-haiku-latest"),
  },
  "claude-3-7-sonnet": {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    developer: "Anthropic",
    shortDescription: "Enhanced Claude iteration",
    fullDescription:
      "An intermediate evolution in the Claude 3 series. Brings incremental improvements in reasoning and comprehension while maintaining the reliable performance Claude is known for.",
    requiresPro: true,
    disabled: false,
    premium: false,
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
    runtime: anthropic("claude-3-7-sonnet-latest"),
  },
  "claude-4-sonnet": {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    developer: "Anthropic",
    shortDescription: "Anthropic's cutting-edge release",
    fullDescription:
      "Anthropic's newest breakthrough. A substantial leap forward from Claude 3.5 Sonnet, offering enhanced programming abilities and logical reasoning with remarkably accurate instruction following.",
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
    runtime: anthropic("claude-sonnet-4-20250514"),
  },
  "gemini-2-0-flash": {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    developer: "Google",
    shortDescription: "Google's rapid multimodal solution",
    fullDescription:
      "Google's standout offering balancing velocity with precision. While not matching Claude 3.5 Sonnet's raw intelligence, it excels in speed and affordability with a massive context capacity.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
    },
    features: ["images", "pdfs", "search", "fast"],
    runtime: google("gemini-2.0-flash-latest"),
  },
  "gemini-2-5-flash": {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    developer: "Google",
    shortDescription: "Google's newest speed demon",
    fullDescription:
      "Google's freshest high-velocity offering with integrated web search capabilities. Delivers exceptional responsiveness and value, though slightly behind Claude 3.5 Sonnet in raw cognitive power. Features enormous context handling.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 65535,
    },
    features: ["images", "pdfs", "search", "fast"],
    runtime: google("gemini-2.5-flash"),
  },
  "gemini-2-5-pro": {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    developer: "Google",
    shortDescription: "Google's top-tier intelligence",
    fullDescription:
      "Google's apex achievement in AI sophistication. Shines brightest when confronting elaborate logical puzzles and analytical tasks. Exceptional prowess in computational challenges, theoretical mathematics, and scientific domains.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 200000,
      maxOutputTokens: 64000,
    },
    features: [
      "parameters",
      "images",
      "pdfs",
      "search",
      "reasoning",
      "reasoningEffort",
    ],
    runtime: google("gemini-2.5-pro"),
  },
  o3: {
    id: "o3",
    name: "O3",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Advanced reasoning powerhouse",
    fullDescription:
      "OpenAI's breakthrough reasoning model. Designed for tackling the most complex analytical and problem-solving tasks with unprecedented depth and accuracy.",
    requiresPro: true,
    disabled: false,
    premium: true,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["reasoning", "reasoningEffort", "parameters"],
    runtime: openai("o3"),
  },
  "o3-mini": {
    id: "o3-mini",
    name: "O3 Mini",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Compact reasoning model",
    fullDescription:
      "A distilled version of O3 that brings advanced reasoning capabilities to a more accessible tier. Balances sophisticated analysis with improved efficiency.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["reasoning", "parameters", "fast"],
    runtime: openai("o3-mini"),
  },
  "o4-mini": {
    id: "o4-mini",
    name: "O4 Mini",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Next-gen compact model",
    fullDescription:
      "The evolution of OpenAI's efficient model line. Combines enhanced capabilities with remarkable speed, ideal for applications requiring quick, intelligent responses.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters", "fast", "reasoning"],
    runtime: openai("o4-mini"),
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Enhanced GPT-4 evolution",
    fullDescription:
      "The refined successor to GPT-4, incorporating architectural improvements and expanded capabilities. Delivers superior performance across creative and analytical tasks.",
    requiresPro: true,
    disabled: false,
    premium: false,
    modelPickerDefault: true,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters"],
    runtime: openai("gpt-4.1"),
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Efficient GPT-4.1 variant",
    fullDescription:
      "A streamlined iteration of GPT-4.1 focusing on accessibility and speed. Maintains core capabilities while optimizing for rapid deployment and cost-effectiveness.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 16384,
    },
    features: ["images", "parameters", "fast"],
    runtime: openai("gpt-4.1-mini"),
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "OpenAI",
    developer: "OpenAI",
    shortDescription: "Ultra-lightweight GPT variant",
    fullDescription:
      "The most compact member of the GPT-4.1 family. Engineered for maximum efficiency without sacrificing core intelligence, perfect for high-volume applications.",
    requiresPro: false,
    disabled: false,
    premium: false,
    modelPickerDefault: false,
    limits: {
      maxInputTokens: 1000000,
      maxOutputTokens: 16384,
    },
    features: ["parameters", "fast"],
    runtime: openai("gpt-4.1-nano"),
  },
};

export function isModelAvailable(
  modelId: ModelId,
  userPlan: "free" | "pro" | "premium" = "free",
  apiCredits: number = 0,
): boolean {
  const model = MODEL_CONFIGS[modelId];
  if (!model) return false;

  if (model.disabled) return false;

  if (!model.requiresPro) return true;

  if (userPlan === "pro" || userPlan === "premium") return true;

  if (apiCredits > 0) return true;

  return false;
}

export function getAvailableModels(
  userPlan: "free" | "pro" | "premium" = "free",
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
  userPlan: "free" | "pro" | "premium" = "free",
): ModelConfig {
  const availableModels = getAvailableModels(userPlan);
  const defaultModel = availableModels.find((m) => m.modelPickerDefault);
  return defaultModel || availableModels[0] || MODEL_CONFIGS[DEFAULT_MODEL_ID];
}

export const textEmbedding = openai.textEmbeddingModel(
  "text-embedding-3-small",
);
