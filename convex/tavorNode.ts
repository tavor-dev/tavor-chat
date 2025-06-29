"use node";

// to be able to use the stream primitive in Convex, we need to use the
// node runtime here instead of the default Convex one

import { Tavor } from "@tavor/sdk";
import { v } from "convex/values";
import invariant from "tiny-invariant";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const DEFAULT_BOX_TIMEOUT = 60 * 60 * 6; // 6 hours
export const MAX_OUTPUT_LENGTH = 1000;
export const DEFAULT_TIMEOUT_MS = 60 * 1000;
export const MAX_TIMEOUT_MS = 300 * 1000;
const PEEK_MS = 10 * 1000;
const TIMEOUT_LEEWAY_MS = 100;

/**
 * Ring buffer to accumulate output while maintaining a maximum size
 */
class RingBuffer {
  private buffer: string[] = [];
  private totalChars = 0;
  private readonly maxChars: number;

  constructor(maxChars: number) {
    this.maxChars = maxChars;
  }

  append(text: string) {
    if (!text) return;

    this.buffer.push(text);
    this.totalChars += text.length;

    // Remove oldest entries if we exceed max chars
    while (this.totalChars > this.maxChars && this.buffer.length > 1) {
      const removed = this.buffer.shift()!;
      this.totalChars -= removed.length;
    }
  }

  toString(): string {
    const output = this.buffer.join("");
    if (this.buffer.length > 0 && this.totalChars > this.maxChars) {
      return "[Output truncated - showing recent output]\n..." + output;
    }
    return output;
  }
}

export const runCommandInBox = internalAction({
  args: {
    threadId: v.id("threads"),
    command: v.string(),
    background: v.union(v.boolean(), v.null()),
    timeoutMs: v.union(v.number(), v.null()),
  },
  returns: v.string(),
  handler: async (
    ctx,
    { threadId, command, background: backgroundArg, timeoutMs: timeoutMsArg },
  ) => {
    const thread = await ctx.runQuery(internal.threads.getById, { threadId });
    invariant(thread, "expected thread to be present");

    const background = backgroundArg || false;
    const timeoutMs = timeoutMsArg || DEFAULT_TIMEOUT_MS;

    const tavorBox = await ctx.runAction(internal.tavor.ensureBox, {
      threadId,
    });

    const tavor = new Tavor();
    const box = await tavor.getBox(tavorBox);
    await box.refresh();

    const effectiveTimeout = Math.min(timeoutMs, MAX_TIMEOUT_MS);

    const stdoutBuffer = new RingBuffer(MAX_OUTPUT_LENGTH);
    const stderrBuffer = new RingBuffer(MAX_OUTPUT_LENGTH);
    let exitCode: number | undefined;
    let commandFinished = false;

    if (background) {
      // We use a peek timeout here to get some initial output
      // in case this fails or something important occurs first.
      const commandPromise = box
        .run(command, {
          onStdout: (line) => stdoutBuffer.append(line + "\n"),
          onStderr: (line) => stderrBuffer.append(line + "\n"),
        })
        .then((result) => {
          exitCode = result.exitCode;
          commandFinished = true;
          return result;
        })
        .catch((error) => {
          stderrBuffer.append(`Error: ${error.message}\n`);
          exitCode = 1;
          commandFinished = true;
          throw error;
        });

      await Promise.race([
        commandPromise,
        new Promise((resolve) => setTimeout(resolve, PEEK_MS)),
      ]);

      const output =
        stdoutBuffer.toString() +
        (stderrBuffer.toString() ? "\n" + stderrBuffer.toString() : "");

      let retOutput = "";
      if (commandFinished) {
        retOutput = "Command already finished. ";
      } else {
        retOutput = "Command started in background. ";
      }

      if (output) {
        retOutput += `Output: ${output}`;
      } else {
        retOutput += "No output yet.";
      }

      return `
<background>true</background>
<finished>${commandFinished}</finished>
${
  commandFinished
    ? `
  <success>${exitCode === 0}</success>
  <exit_code>${exitCode ?? -1}</exit_code>
`
    : ""
}
<output>
${retOutput}
</output>`;
    }

    try {
      const result = await Promise.race([
        box.run(command, {
          onStdout: (line) => stdoutBuffer.append(line + "\n"),
          onStderr: (line) => stderrBuffer.append(line + "\n"),
          timeout: effectiveTimeout - TIMEOUT_LEEWAY_MS,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Command timed out after ${effectiveTimeout}ms, retry with bigger timeout if necessary or run in background.`,
                ),
              ),
            effectiveTimeout,
          ),
        ),
      ]);

      exitCode = result.exitCode;
      commandFinished = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("timed out")) {
        stderrBuffer.append(`\n${error.message}\n`);
        exitCode = 124; // Standard timeout exit code
      } else {
        stderrBuffer.append(`\nError: ${error}\n`);
        exitCode = 1;
      }
      commandFinished = true;
    }

    const output =
      stdoutBuffer.toString() +
      (stderrBuffer.toString() ? "\nSTDERR:\n" + stderrBuffer.toString() : "");

    return `
<background>false</background>
<exit_code>${exitCode ?? -1}</exit_code>
<success>${exitCode === 0}</success>
<timeout_ms>${effectiveTimeout}</timeout_ms>
<output>
${output || "(no output)"}
</output>`;
  },
});
