import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Id } from "@cvx/_generated/dataModel";
import type { UIMessageWithFiles } from "@/components/chat/Chat";

/**
 * A list of all message IDs in the current thread, in order.
 * Components that need to render the list of messages should use this.
 */
export const messageIdsAtom = atom<Id<"messages">[]>([]);

/**
 * An atom family that stores the state of each individual message.
 * A component for a single message should subscribe to an atom from this family.
 * This ensures that when a message is updated (e.g., during streaming),
 * only the component for that specific message re-renders.
 */
export const messageFamily = atomFamily(
  (_id: Id<"messages">) => atom<UIMessageWithFiles | null>(null),
  (a, b) => a === b,
);

export const reasoningStatusFamily = atomFamily((_id: string) =>
  atom<boolean>(false),
);

/**
 * An atom family for tool status expanded/collapsed state.
 * Each tool invocation gets its own state that persists during streaming.
 */
export const toolStatusFamily = atomFamily((_id: string) =>
  atom<boolean>(false),
);

/**
 * A write-only atom to update a message in the family,
 * but only if its content has actually changed.
 * We use JSON.stringify for a pragmatic deep comparison.
 */
export const updateMessageAtom = atom(
  null, // it's a write-only atom
  (get, set, msg: UIMessageWithFiles) => {
    const msgId = msg.id as Id<"messages">;
    const existingMsg = get(messageFamily(msgId));

    // Avoid re-render if message is identical. This prevents re-renders
    // for unchanged messages when the list is processed on each stream chunk.
    if (JSON.stringify(existingMsg) !== JSON.stringify(msg)) {
      set(messageFamily(msgId), msg);
    }
  },
);

/**
 * Atom to track if the agent is currently generating a response.
 */
export const isGeneratingAtom = atom(false);

/**
 * Atom to track if the agent has hit the maximum number of steps.
 */
export const hitMaxStepsAtom = atom(false);

/**
 * A derived atom to get the role of the last message in the list.
 * This is used to determine if we should show the "Thinking..." bubble.
 */
export const lastMessageRoleAtom = atom((get) => {
  const ids = get(messageIdsAtom);
  if (ids.length === 0) return null;
  const lastId = ids[ids.length - 1]!;
  const lastMessage = get(messageFamily(lastId));
  return lastMessage?.role ?? null;
});
