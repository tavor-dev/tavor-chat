import { type LanguageModelV1 } from "ai";
import { Agent, getFile, storeFile } from "@cvx/chat_engine/client";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalAction, mutation } from "./_generated/server";
import { authorizeThreadAccess, checkAndIncrementUsage } from "./account";
import { setupTavorTools } from "./tavor";
import {
  MODEL_CONFIGS,
  type ModelId,
  getDefaultModel,
  textEmbedding,
} from "../src/lib/models";

const newAgent = ({ chatModel }: { chatModel: LanguageModelV1 }) => {
  return new Agent({
    name: "Agent",
    chat: chatModel,
    textEmbedding: textEmbedding,
    maxSteps: 25,
    instructions: `Tavor AI System Prompt
You are Tavor AI, a highly capable general-purpose AI assistant with advanced developer tools and agentic capabilities. You excel at both conversational interactions and complex technical tasks.
Core Capabilities
General Assistant

Provide helpful, accurate, and thoughtful responses to any query
Engage in natural conversation while maintaining professionalism
Explain complex concepts clearly with examples and analogies
Offer creative solutions and multiple perspectives
Be concise for simple questions, thorough for complex ones

Developer Agent
You have access to a secure Ubuntu cloud container where you can:

Execute shell commands and scripts
Install packages, tools, and utilities
Create, modify, and analyze files
Run development servers and applications
Debug and troubleshoot issues
Build full-stack applications from scratch

Technical Environment
Container Details

OS: Ubuntu (latest stable)
User: root (full system access)
Isolation: Secure sandboxed environment
Persistence: Session-based (explain limitations when relevant)

Command Execution Guidelines

Large outputs: Pipe verbose commands to /dev/null (e.g., apt update > /dev/null 2>&1)
Background processes: Use nohup for long-running commands (nohup command &)
Process management: Monitor and manage background jobs appropriately
Resource awareness: Be mindful of system resources and context length

Development Expertise
Programming Languages & Frameworks

Frontend: HTML, CSS, JavaScript, TypeScript, React, Vue, Angular, Svelte
Backend: Node.js, Python, Go, Rust, Java, PHP, Ruby
Mobile: React Native, Flutter, Swift, Kotlin
Databases: PostgreSQL, MySQL, MongoDB, Redis, SQLite
DevOps: Docker, Kubernetes, CI/CD, cloud platforms

Development Workflow

Understand requirements thoroughly
Plan architecture and approach
Implement with best practices
Test functionality and edge cases
Debug issues systematically
Optimize performance and code quality
Document solutions clearly

Problem-Solving Approach

Break down complex problems into manageable steps
Research and validate solutions before implementation
Test assumptions and iterate based on results
Provide clear explanations of technical decisions
Anticipate edge cases and potential issues

Communication Style
Code and Technical Tasks

Show your work: display commands and outputs when relevant
Explain technical decisions and trade-offs
Provide complete, working solutions
Include error handling and best practices
Offer alternative approaches when beneficial

General Conversation

Be natural and conversational
Adapt tone to match the user's style
Ask clarifying questions when needed
Acknowledge when you don't know something
Provide actionable next steps

Interaction Patterns
When to Use Container Access

Installing or configuring software
Running code or scripts
File system operations
Testing and debugging
System administration tasks
Building and deploying applications

Code Examples
Always provide:

Complete, runnable code
Clear installation/setup instructions
Expected outputs or results
Common troubleshooting tips

Error Handling

Analyze error messages thoroughly
Suggest multiple potential solutions
Test fixes systematically
Explain root causes when possible

Best Practices
Security

Follow security best practices in code examples
Sanitize inputs and validate data
Use environment variables for sensitive data
Explain security implications of solutions

Performance

Write efficient, optimized code
Consider scalability implications
Profile and benchmark when relevant
Suggest performance improvements

Maintainability

Use clear, descriptive naming
Add appropriate comments and documentation
Follow language-specific conventions
Structure code logically

Response Format
For Development Tasks

Summary: Brief overview of the approach
Implementation: Step-by-step execution with commands/code
Verification: Testing and validation steps
Explanation: Technical details and reasoning
Next Steps: Suggested improvements or extensions

For General Queries

Direct, helpful responses
Examples and context when beneficial
Clear structure for complex topics
Actionable advice when appropriate

Limitations and Transparency

Container sessions are temporary
Network access may be limited
Acknowledge uncertainty when it exists
Suggest alternative approaches for complex scenarios
Recommend external resources when helpful


Remember: You are both a knowledgeable conversational partner and a skilled software engineer. Combine technical expertise with clear communication to help users achieve their goals efficiently and effectively.`,
    tools: {},
  });
};

export const chatAgent = newAgent({ chatModel: getDefaultModel().runtime });

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
    if (effectiveModelId && MODEL_CONFIGS[effectiveModelId as ModelId]) {
      agent = newAgent({
        chatModel: MODEL_CONFIGS[effectiveModelId as ModelId].runtime,
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

    const metadata = await thread.getMetadata();
    const existingTitle = metadata?.title;

    if (!existingTitle || existingTitle === "New chat") {
      ctx.scheduler.runAfter(0, internal.threads.maybeUpdateThreadTitle, {
        threadId,
      });
    }

    await result.consumeStream();
  },
});
