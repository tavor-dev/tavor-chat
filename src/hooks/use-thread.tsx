import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { Id } from "@cvx/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";

export const useThread = (threadId: Id<"threads">) => {
  const { data: thread } = useQuery(
    convexQuery(
      api.threads.getByIdForCurrentUser,
      threadId ? { threadId } : "skip",
    ),
  );

  return !threadId ? null : thread;
};
