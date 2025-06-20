import { insertAtTop } from "convex/react";
import type { MessageDoc } from "@cvx/schema";
import type { OptimisticLocalStore } from "convex/browser";
import type { ThreadQuery } from "./types";
import { Id } from "@cvx/_generated/dataModel";

export function optimisticallySendMessage(
  query: ThreadQuery<unknown, MessageDoc>,
): (
  store: OptimisticLocalStore,
  args: { threadId: string; prompt: string },
) => void {
  return (store, args) => {
    const queries = store.getAllQueries(query);
    let maxOrder = 0;
    let maxStepOrder = 0;
    for (const q of queries) {
      if (q.args?.threadId !== args.threadId) continue;
      if (q.args.streamArgs) continue;
      for (const m of q.value?.page ?? []) {
        maxOrder = Math.max(maxOrder, m.order);
        maxStepOrder = Math.max(maxStepOrder, m.stepOrder);
      }
    }
    const order = maxOrder + 1;
    const stepOrder = 0;
    insertAtTop({
      paginatedQuery: query,
      argsToMatch: { threadId: args.threadId, streamArgs: undefined },
      item: {
        _creationTime: Date.now(),
        _id: crypto.randomUUID() as Id<"messages">,
        order,
        stepOrder,
        status: "pending",
        threadId: args.threadId as Id<"threads">,
        tool: false,
        message: {
          role: "user",
          content: args.prompt,
        },
        text: args.prompt,
      },
      localQueryStore: store,
    });
  };
}
