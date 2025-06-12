import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { authorizeThreadAccess } from "./account";

const models = {
  // OpenAI models
  "gpt-4o-mini": openai.chat("gpt-4o-mini"),
  "gpt-4o": openai.chat("gpt-4o"),

  // Anthropic models
  "claude-3-5-sonnet": anthropic.chat("claude-3-5-sonnet-latest"),
  "claude-3-5-haiku": anthropic.chat("claude-3-5-haiku-latest"),

  // Google models
  "gemini-2-0-flash": google.chat("gemini-2.0-flash-latest"),
  "gemini-2-5-flash": google.chat("gemini-2.5-flash-latest"),
  "gemini-2-5-pro": google.chat("gemini-2.5-pro-latest"),
} as const;

// Default model and embedding
const defaultChat = models["gpt-4o-mini"];
const textEmbedding = openai.textEmbeddingModel("text-embedding-3-small");

const newAgent = ({
  chatModel,
}: {
  chatModel: (typeof models)[keyof typeof models];
}) => {
  return new Agent(components.agent, {
    name: "Agent",
    chat: chatModel,
    textEmbedding: textEmbedding,
    instructions:
      "You're an interactive, fun LLM that can tell stories and jokes, ~200 words.",
  });
};

export const chatAgent = newAgent({ chatModel: defaultChat });

export const streamAsynchronously = mutation({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.object({ messageId: v.string() }),
  handler: async (ctx, { prompt, threadId, model }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId,
      prompt,
      // we're in a mutation, so skip embeddings for now. They'll be generated
      // lazily when streaming text.
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.chat.stream, {
      threadId,
      promptMessageId: messageId,
      model,
    });
    return { messageId };
  },
});

export const stream = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { promptMessageId, threadId, model }) => {
    const threadData = await ctx.runQuery(api.threads.getThreadData, {
      threadId,
    });
    const effectiveModelId = model || threadData?.model;

    // Create a custom agent with the selected model if provided
    let agent = chatAgent;
    if (effectiveModelId && models[effectiveModelId as keyof typeof models]) {
      agent = newAgent({
        chatModel: models[effectiveModelId as keyof typeof models],
      });
    }

    const { thread } = await agent.continueThread(ctx, { threadId });

    // Start streaming immediately
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true },
    );

    // Schedule title generation in the background
    ctx.scheduler.runAfter(0, internal.threads.maybeUpdateThreadTitle, {
      threadId,
    });

    await result.consumeStream();
  },
});
