import {
  type ChunkDetector,
  smoothStream,
  type StreamTextTransform,
  type ToolSet,
} from "ai";
import type {
  ProviderOptions,
  StreamDelta,
  TextStreamPart,
} from "../validators";
import type { AgentComponent, MessageDoc } from "./index";
import type { RunActionCtx } from "./types";
import { Id } from "@cvx/_generated/dataModel";

export type StreamingOptions = {
  /**
   * The minimum granularity of deltas to save.
   * Note: this is not a guarantee that every delta will be exactly one line.
   * E.g. if "line" is specified, it won't save any deltas until it encounters
   * a newline character.
   * Defaults to a regex that chunks by punctuation followed by whitespace.
   */
  chunking?: "word" | "line" | RegExp | ChunkDetector;
  /**
   * The minimum number of milliseconds to wait between saving deltas.
   * Defaults to 250.
   */
  throttleMs?: number;
};
export const DEFAULT_STREAMING_OPTIONS = {
  // This chunks by sentences / clauses. Punctuation followed by whitespace.
  chunking: /[\p{P}\s]/u,
  throttleMs: 250,
} satisfies StreamingOptions;

export function mergeTransforms<TOOLS extends ToolSet>(
  options: StreamingOptions | boolean | undefined,
  existing:
    | StreamTextTransform<TOOLS>
    | Array<StreamTextTransform<TOOLS>>
    | undefined,
) {
  if (!options) {
    return existing;
  }
  const chunking =
    typeof options === "boolean"
      ? DEFAULT_STREAMING_OPTIONS.chunking
      : options.chunking;
  const transforms = Array.isArray(existing)
    ? existing
    : existing
      ? [existing]
      : [];
  transforms.push(smoothStream({ delayInMs: null, chunking }));
  return transforms;
}

export class DeltaStreamer {
  public streamId: Id<"streamingMessages"> | undefined;
  public readonly options: Required<StreamingOptions>;
  #nextParts: TextStreamPart[] = [];
  #nextOrder: number;
  #nextStepOrder: number;
  #latestWrite: number = 0;
  #ongoingWrite: Promise<void> | undefined;
  #cursor: number = 0;
  public abortController: AbortController;

  constructor(
    public readonly component: AgentComponent,
    public readonly ctx: RunActionCtx,
    options: true | StreamingOptions,
    public readonly metadata: {
      threadId: Id<"threads">;
      agentName: string | undefined;
      model: string | undefined;
      provider: string | undefined;
      providerOptions: ProviderOptions | undefined;
      userId: Id<"users"> | undefined;
      order: number | undefined;
      stepOrder: number | undefined;
    },
    // I don't make the rules but.. if passing abortSignal in the metadata
    // it somehow doesn't make this execute properly
    abortSignal: AbortSignal | undefined,
  ) {
    this.options =
      typeof options === "boolean"
        ? DEFAULT_STREAMING_OPTIONS
        : {
            ...DEFAULT_STREAMING_OPTIONS,
            ...options,
          };
    this.metadata = metadata;
    this.#nextParts = [];
    this.#nextOrder = metadata.order ?? 0;
    this.#nextStepOrder = (metadata.stepOrder ?? 0) + 1;
    this.abortController = new AbortController();
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        this.abortController.abort();
      });
    }
  }
  public async addParts(parts: TextStreamPart[]) {
    if (this.abortController.signal.aborted) {
      return;
    }
    if (!this.metadata.userId) {
      throw new Error("userId is required to create a stream");
    }
    if (!this.streamId) {
      this.streamId = await this.ctx.runMutation(
        this.component.chat_engine.streams.create,
        {
          ...this.metadata,
          order: this.#nextOrder,
          stepOrder: this.#nextStepOrder,
        },
      );
    }
    this.#nextParts.push(...parts);
    if (
      !this.#ongoingWrite &&
      Date.now() - this.#latestWrite >= this.options.throttleMs
    ) {
      this.#ongoingWrite = this.#sendDelta();
    }
  }

  async #sendDelta() {
    if (this.abortController.signal.aborted) {
      return;
    }
    const delta = this.#createDelta();
    this.#latestWrite = Date.now();
    try {
      const success = await this.ctx.runMutation(
        this.component.chat_engine.streams.addDelta,
        delta,
      );
      if (!success) {
        this.abortController.abort();
      }
    } catch (e) {
      this.abortController.abort();
      throw e;
    }
    // Now that we've sent the delta, check if we need to send another one.
    if (
      this.#nextParts.length > 0 &&
      Date.now() - this.#latestWrite >= this.options.throttleMs
    ) {
      // We send again immediately with the accumulated deltas.
      this.#ongoingWrite = this.#sendDelta();
    } else {
      this.#ongoingWrite = undefined;
    }
  }

  #createDelta(): StreamDelta {
    const start = this.#cursor;
    const end = start + this.#nextParts.length;
    this.#cursor = end;
    const parts = this.#nextParts;
    this.#nextParts = [];
    if (!this.streamId) {
      throw new Error("Creating a delta before the stream is created");
    }
    return {
      streamId: this.streamId,
      start,
      end,
      parts,
    };
  }

  public async finish(messages: MessageDoc[]) {
    if (this.#ongoingWrite) {
      await this.#ongoingWrite;
      this.#ongoingWrite = undefined;
    }
    if (!this.streamId) {
      throw new Error("Finish called before stream is created");
    }
    const lastMessage = messages.at(-1);
    if (lastMessage) {
      this.#nextOrder = lastMessage.order;
      this.#nextStepOrder = lastMessage.stepOrder + 1;
    } else {
      console.warn("Step finished without generating a message");
    }
    const finalDelta =
      this.#nextParts.length > 0 ? this.#createDelta() : undefined;
    this.#nextParts = [];
    const streamId = this.streamId;
    this.streamId = undefined;
    this.#cursor = 0;
    await this.ctx.runMutation(this.component.chat_engine.streams.finish, {
      streamId,
      finalDelta,
    });
  }
}
