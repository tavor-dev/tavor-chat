import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { Agent, getFile, storeFile } from "@cvx/chat_engine/client";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalAction, mutation } from "./_generated/server";
import { authorizeThreadAccess, checkAndIncrementUsage, getUserId } from "./account";
import { z } from "zod";

const models = {
  "gpt-4o-mini": openai("gpt-4o-mini"),
  "gpt-4o": openai("gpt-4o"),

  "claude-3-5-sonnet": anthropic("claude-3-5-sonnet-latest"),
  "claude-3-5-haiku": anthropic("claude-3-5-haiku-latest"),

  "gemini-2-0-flash": google("gemini-2.0-flash-latest"),
  "gemini-2-5-flash": google("gemini-2.5-flash-preview-05-20"),
  "gemini-2-5-pro": google("gemini-2.5-pro-latest"),
} as const;

const defaultChat = models["gpt-4o-mini"];
const textEmbedding = openai.textEmbeddingModel("text-embedding-3-small");

const newAgent = ({
  chatModel,
}: {
  chatModel: (typeof models)[keyof typeof models];
}) => {
  return new Agent({
    name: "Agent",
    chat: chatModel,
    textEmbedding: textEmbedding,
    maxSteps: 25,
    instructions:
      "You're an interactive, fun LLM that can tell stories and jokes, ~200 words.",
    tools: {},
  });
};

export const chatAgent = newAgent({ chatModel: defaultChat });

export const uploadFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    console.log(userId);
    // Maybe rate limit how often a user can upload a file / attribute?
    const {
      file: { fileId, url },
    } = await storeFile(
      ctx,
      new Blob([args.bytes], { type: args.mimeType }),
      args.filename,
      args.sha256,
    );
    return { fileId, url };
  },
});

export const streamAsynchronously = mutation({
  args: {
    prompt: v.string(),
    threadId: v.id("threads"),
    model: v.optional(v.string()),
    files: v.optional(
      v.array(
        v.object({
          fileId: v.id("files"),
        }),
      ),
    ),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, { prompt, threadId, model, files }) => {
    await authorizeThreadAccess(ctx, threadId);

    // This will throw if the user is over their limit
    await checkAndIncrementUsage(ctx);

    const safeFiles = files || [];
    const parsedFiles = await Promise.all(
      safeFiles.map(async (file) => {
        const { filePart, imagePart } = await getFile(ctx, file.fileId);

        return { filePart, imagePart };
      }),
    );

    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: [
          ...parsedFiles.map((f) => f.imagePart ?? f.filePart),
          { type: "text", text: prompt },
        ],
      },
      metadata: {
        fileIds:
          safeFiles.length > 0 ? safeFiles.map((f) => f.fileId) : undefined,
      },
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
    promptMessageId: v.id("messages"),
    threadId: v.id("threads"),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { promptMessageId, threadId, model }) => {
    const tempThread = await ctx.runQuery(api.threads.getById, { threadId });
    const effectiveModelId = model || tempThread?.model;

    let agent = chatAgent;
    if (effectiveModelId && models[effectiveModelId as keyof typeof models]) {
      agent = newAgent({
        chatModel: models[effectiveModelId as keyof typeof models],
      });
    }

    const { thread } = await agent.continueThread(ctx, {
      threadId,
      tools: setupTavorTools({ threadId }),
    });
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true },
    );

    ctx.scheduler.runAfter(0, internal.threads.maybeUpdateThreadTitle, {
      threadId,
    });

    await result.consumeStream();
  },
});
