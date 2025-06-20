import type { BetterOmit, Expand } from "convex-helpers";
import type {
  FunctionArgs,
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { MessageDoc } from "@cvx/schema";
import type { SyncStreamsReturnValue } from "@cvx/chat_engine/client/types";
import { StreamArgs } from "@cvx/chat_engine/validators";

export type ThreadQuery<
  Args = unknown,
  M extends MessageDoc = MessageDoc,
> = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: PaginationOptions;
    // TODO: will this allow passing a function that doesn't have this param?
    /**
     * If { stream: true } is passed, it will also query for stream deltas.
     * In order for this to work, the query must take as an argument streamArgs.
     */
    streamArgs?: StreamArgs;
  } & Args,
  PaginationResult<M> & { streams?: SyncStreamsReturnValue }
>;

export type ThreadStreamQuery<
  Args = Record<string, unknown>,
  M extends MessageDoc = MessageDoc,
> = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: PaginationOptions;
    streamArgs?: StreamArgs; // required for stream query
  } & Args,
  PaginationResult<M> & { streams: SyncStreamsReturnValue }
>;

export type ThreadMessagesArgs<Query extends ThreadQuery<unknown, MessageDoc>> =
  Query extends ThreadQuery<unknown, MessageDoc>
    ? Expand<BetterOmit<FunctionArgs<Query>, "paginationOpts" | "streamArgs">>
    : never;

export type ThreadMessagesResult<
  Query extends ThreadQuery<unknown, MessageDoc>,
> = Query extends ThreadQuery<unknown, infer M> ? M : never;
