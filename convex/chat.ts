import { Agent, getFile, storeFile } from "@cvx/chat_engine/client";
import { type LanguageModelV1 } from "ai";
import { v } from "convex/values";
import {
  MODEL_CONFIGS,
  type ModelId,
  getDefaultModel,
  textEmbedding,
} from "../src/lib/models";
import { internal } from "./_generated/api";
import { action, internalAction, mutation } from "./_generated/server";
import {
  authorizeThreadAccess,
  checkAndIncrementUsage,
  validateCanUseModel,
} from "./account";
import { setupTavorTools } from "./tavor";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";

// MODIFICATION 1: Extract the default system prompt into a constant.
const DEFAULT_SYSTEM_PROMPT = `You are Tavor AI, an advanced AI assistant with powerful agentic capabilities and access to secure containerized development environments. You excel at both conversational interactions and complex technical development tasks.

## Development Mode

You can act as an engineer, and develop, execute code with the Tavor sandboxes.

In this mode, you are a powerful agentic AI coding assistant. You are pair programming with a USER to solve their coding task.

The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.

You can run any bash commands you need to complete the task using the executeCommand tool.

### General guidelines

**Application Development for new codebases**:
- Create the full project structure and comprehensive high-level architectural overview
- Create a TODO list of tasks to achive the end goal
- Build full-stack applications with modern frameworks
- **Default Web App Stack** (unless user specifies otherwise):
  - Frontend: React with TypeScript 
  - Styling: Tailwind CSS v4 or v3
  - Components: Shadcn/ui
- **Recommended Boilerplates**:
  - Full-stack apps: https://github.com/t3-oss/create-t3-app (T3 Stack)
  - Simple React apps: bun create vite
  - Admin dashboards: https://github.com/arhamkhnz/next-shadcn-admin-dashboard
  - SaaS landing pages: https://github.com/nextjs/saas-starter (Next.js SaaS Starter)
  - Next.js projects: Use above templates or bunx create-next-app@latest [project-name] [options]
  - Games: Use bun create @phaserjs/game@latest
  - Update vite.config.ts and set \`allowedHosts: true,\` to enable the preview URL
- Create APIs, databases, and authentication systems
- Start all servers as background processes with proper logging

### Workflow Approach

#### For Development Tasks:
1. **Read Documentation**: check for README files and documentation for setup instructions
2. **Understand Requirements**: Ask clarifying questions if needed
3. **Create Detailed Plan**: Outline exact steps, architecture, and technical approach
4. **Execute Plan Step-by-Step**:
   - Start the development server as soon as possible and return the preview URL early and continue developing on top
   - Never skip planned steps
   - If any step fails, debug and fix before proceeding
   - Do not simplify tasks that compromise core functionality
   - Verify each step: check logs, processes, and functionality
5. **Monitor & Verify**:
   - Test functionality before moving to next step where applicable
6. **Provide Access**: Return preview URLs and clear access instructions

#### For Debugging:
1. **Analyze Error**: Examine logs, error messages, and system state
2. **Identify Root Cause**: Trace the issue to its source
3. **Implement Fix**: Apply the necessary corrections
4. **Verify Resolution**: Test to ensure the issue is resolved
5. **Prevent Recurrence**: Suggest improvements to avoid similar issues
6. **Use sed**: When it's easier to apply patches, instead of rewriting files fully use \`sed\`

### Communication Guidelines
- Explain technical decisions and trade-offs
- Provide step-by-step instructions when helpful
- Share relevant code snippets and configuration examples
- Offer alternatives and suggest improvements
- Be transparent about limitations or potential issues
- Ask for feedback and iterate based on user needs

### Response Format for Development Tasks
1. **Summary**: Brief description of what will be built/fixed
2. **Technical Details**: Architecture, technologies, and approach
3. **Implementation**: Execute the development work
4. **Testing**: Verify functionality and performance
5. **Access Information**: Provide URLs, credentials, and usage instructions
6. **Next Steps**: Suggest improvements, additional features, or maintenance tasks
7. **Create README**: Showcase new creation and provide comprehensive README and setup instructions

Remember: You have full root access to your container environment. Use this power responsibly to create secure, efficient, and well-structured applications that meet user requirements while following best practices.`;

// MODIFICATION 2: Modify newAgent to accept `instructions` as an argument.
const newAgent = ({
  chatModel,
  instructions,
}: {
  chatModel: LanguageModelV1;
  instructions: string;
}) => {
  return new Agent({
    name: "Agent",
    chat: chatModel,
    textEmbedding: textEmbedding,
    maxSteps: 100,
    instructions: instructions, // Use the provided instructions
    tools: {},
  });
};

export const chatAgent = newAgent({
  chatModel: getDefaultModel().runtime,
  instructions: DEFAULT_SYSTEM_PROMPT, // The default agent uses the default prompt
});

export const uploadFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // const userId = await getUserId(ctx);
    // console.log(userId);
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

    // Check for active streams
    const activeStreams = await ctx.db
      .query("streamingMessages")
      .withIndex("threadId_state_order_stepOrder", (q) =>
        q.eq("threadId", threadId).eq("state.kind", "streaming"),
      )
      .take(1);
    if (activeStreams.length > 0) {
      throw new Error(
        "A message is currently being generated for this thread.",
      );
    }

    if (model) {
      await validateCanUseModel(ctx, model);
    }

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
        providerOptions: {
          anthropic: {
            cacheControl: { type: "ephemeral" },
          } as AnthropicProviderOptions,
        },
      },
      metadata: {
        fileIds:
          safeFiles.length > 0 ? safeFiles.map((f) => f.fileId) : undefined,
      },
      skipEmbeddings: true,
    });

    await ctx.db.patch(threadId, {
      generating: true,
      cancelRequested: false,
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
    const tempThread = await ctx.runQuery(internal.threads.getById, {
      threadId,
    });
    const effectiveModelId = model || tempThread?.model;

    if (effectiveModelId && tempThread && tempThread.userId) {
      await validateCanUseModel(ctx, effectiveModelId, tempThread.userId);
    }

    // --- MODIFICATION 3: CONSTRUCT THE DYNAMIC SYSTEM PROMPT ---
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (tempThread?.userId) {
      // We need to use `runQuery` because we are in an `internalAction`
      const user = await ctx.runQuery(internal.chat_engine.users.getById, {
        userId: tempThread.userId,
      });

      if (user?.customSystemPrompt && user.customSystemPrompt.trim() !== "") {
        if (user.systemPromptMode === "replace") {
          systemPrompt = user.customSystemPrompt;
        } else {
          // Default to 'enhance' if mode is 'enhance' or not set
          systemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\nAdditional instructions: ${user.customSystemPrompt}`;
        }
      }
    }

    // MODIFICATION 4: Create the agent with our dynamically constructed prompt.
    const effectiveModel = effectiveModelId
      ? MODEL_CONFIGS[effectiveModelId as ModelId]
      : getDefaultModel();

    const agent = newAgent({
      chatModel: effectiveModel.runtime,
      instructions: systemPrompt,
    });
    // --- END OF MODIFICATIONS ---

    const { thread } = await agent.continueThread(ctx, {
      threadId,
      tools: setupTavorTools({ threadId }),
    });

    const addReasoning = {} as Record<
      string,
      | AnthropicProviderOptions
      | GoogleGenerativeAIProviderOptions
      | OpenAIResponsesProviderOptions
      | never
    >;
    if (effectiveModel?.features?.includes("reasoning")) {
      if (effectiveModel.developer === "Anthropic") {
        addReasoning.anthropic = {
          thinking: { type: "enabled", budgetTokens: 9000 },
        } satisfies AnthropicProviderOptions;
      } else if (effectiveModel.developer === "Google") {
        addReasoning.google = {
          thinkingConfig: {
            includeThoughts: true,
            // thinkingBudget: 2048, // Optional
          },
        } satisfies GoogleGenerativeAIProviderOptions;
      } else if (effectiveModel.developer === "OpenAI") {
        addReasoning.openai = {
          reasoningSummary: "auto",
        } satisfies OpenAIResponsesProviderOptions;
      }
    }

    const abortController = new AbortController();

    const checkCancellation = async () => {
      const thread = await ctx.runQuery(internal.threads.getById, { threadId });
      if (thread?.cancelRequested) {
        abortController.abort();
        clearInterval(checkInterval);

        await ctx.runMutation(internal.threads.updateGeneratingStatus, {
          threadId,
          generating: false,
        });
      }
    };

    const checkInterval = setInterval(() => {
      checkCancellation().catch(console.error);
    }, 500);

    try {
      const result = await thread.streamText(
        {
          promptMessageId,
          providerOptions: addReasoning,
          abortSignal: abortController.signal,
          toolCallStreaming: true,
        },
        { saveStreamDeltas: true },
      );

      const metadata = await thread.getMetadata();
      const existingTitle = metadata?.title;

      if (!existingTitle || existingTitle === "New chat") {
        ctx.scheduler.runAfter(0, internal.threads.maybeUpdateThreadTitle, {
          threadId,
        });
      }

      await result.consumeStream();
    } finally {
      clearInterval(checkInterval);

      await ctx.runMutation(internal.threads.updateGeneratingStatus, {
        threadId,
        generating: false,
      });
    }
  },
});
