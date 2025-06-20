import { MessageDoc } from "@cvx/schema";
import { useMemo } from "react";

/** True => last assistant turn ended because it reached maxSteps. */
export function useMaxStepsReached(
  messages: MessageDoc[] | undefined,
  generating: boolean,
): boolean {
  return useMemo(() => {
    if (generating || !messages?.length) return false;
    const last = messages[messages.length - 1];
    return !last.finishReason && last.tool && last.status === "success";
  }, [messages, generating]);
}
