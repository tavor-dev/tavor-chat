import {
  cacheThreadMessages,
  getCachedThreadMessages,
} from "@/lib/threadCache";
import { toUIMessages, type UIMessage } from "@/lib/agent/toUIMessages";
// import { cn } from "@/lib/utils";
import { optimisticallySendMessage, useThreadMessages } from "@/lib/agent";
import { Doc, type Id } from "@cvx/_generated/dataModel";
import { Button, Heading, Prompt, Text, Toaster, toast } from "@medusajs/ui";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState, memo, type FC } from "react";
import { api } from "../../../convex/_generated/api";
import { AnswerSection } from "./AnswerSection";
import { ChatPanel, type ProcessedFile } from "./ChatPanel";
import { UserMessage } from "./UserMessage";
import { useNavigate } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMaxStepsReached } from "@/hooks/use-max-steps-reached";
import { Provider as JotaiProvider, useSetAtom, useAtomValue } from "jotai";
import {
  hitMaxStepsAtom,
  isGeneratingAtom,
  lastMessageRoleAtom,
  messageFamily,
  messageIdsAtom,
  updateMessageAtom,
} from "@/lib/state/chatAtoms";

function UpgradeModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const navigate = useNavigate();
  const handleUpgrade = () => {
    onOpenChange(false);
    navigate({ to: "/settings", search: { tab: "billing" } });
  };

  return (
    <Prompt open={isOpen} onOpenChange={onOpenChange}>
      <Prompt.Content>
        <Prompt.Header>
          <Heading>Free message limit reached</Heading>
        </Prompt.Header>
        <div className="p-4">
          <Text>
            You've used all your free messages for this period. Please upgrade
            to the Pro plan to continue chatting.
          </Text>
        </div>
        <Prompt.Footer>
          <Prompt.Cancel onClick={() => onOpenChange(false)}>
            Cancel
          </Prompt.Cancel>
          <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
}

// --- Helper Components for Jotai integration ---

const areArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * This component is a silent worker. It fetches data from Convex,
 * processes it, and syncs it into our Jotai atom store.
 * It now includes a queue to ensure sequential rendering.
 */
const SyncToJotai: FC<{ threadId: Id<"threads"> }> = ({ threadId }) => {
  const [cachedMessages, setCachedMessages] = useState<
    Doc<"messages">[] | null
  >(() => getCachedThreadMessages(threadId));

  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 50000, stream: true },
  );

  const { data: thread } = useQuery(
    convexQuery(api.threads.getByIdForCurrentUser, { threadId }),
  );

  const setMessageIds = useSetAtom(messageIdsAtom);
  const updateMessage = useSetAtom(updateMessageAtom);
  const setIsGenerating = useSetAtom(isGeneratingAtom);
  const setHitMaxSteps = useSetAtom(hitMaxStepsAtom);

  const queue = useRef<UIMessage[][]>([]);
  const isProcessing = useRef(false);

  const processQueue = useCallback(() => {
    if (queue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    const uiMessages = queue.current.shift()!;

    // Update the message IDs list
    const newIds = uiMessages.map((m) => m.id as Id<"messages">);
    setMessageIds((prevIds) => {
      if (areArraysEqual(prevIds, newIds)) {
        return prevIds;
      }
      return newIds;
    });

    // Update individual messages
    for (const msg of uiMessages) {
      updateMessage(msg);
    }

    // Schedule the next processing step with a small delay to pace the rendering.
    // This is the key change to "nerf" the speed and make it feel linear.
    setTimeout(processQueue, 40);
  }, [setMessageIds, updateMessage]);

  useEffect(() => {
    if (!messages.isLoading && messages.results) {
      cacheThreadMessages(threadId, messages.results);
    }

    const serverMessages =
      messages.isLoading && cachedMessages
        ? cachedMessages
        : (messages.results ?? []);

    const uiMessages = toUIMessages(serverMessages);

    // Add the new state to the queue instead of updating directly
    queue.current.push(uiMessages);

    // If the processor is not running, start it
    if (!isProcessing.current) {
      isProcessing.current = true;
      // Start processing immediately, the timeout will handle the rest
      processQueue();
    }
  }, [
    messages.isLoading,
    messages.results,
    cachedMessages,
    threadId,
    processQueue,
  ]);

  useEffect(() => {
    setIsGenerating(!!thread?.generating);
  }, [thread?.generating, setIsGenerating]);

  const maxStepsReached = useMaxStepsReached(
    messages.results,
    !!thread?.generating,
  );
  useEffect(() => {
    setHitMaxSteps(maxStepsReached);
  }, [maxStepsReached, setHitMaxSteps]);

  useEffect(() => {
    // Clear the queue and state when the thread changes
    queue.current = [];
    isProcessing.current = false;
    setCachedMessages(getCachedThreadMessages(threadId));
    setMessageIds([]);
  }, [threadId, setMessageIds]);

  return null;
};

/**
 * Renders a single message. It's memoized and subscribes to its own
 * message atom from the atomFamily. This is the key to performance:
 * only this component re-renders when its specific message data changes.
 */
const MessageRenderer = memo(({ messageId }: { messageId: Id<"messages"> }) => {
  const message = useAtomValue(messageFamily(messageId));

  if (!message) return null;

  return (
    <div
      data-role={message.role}
      className="group/message chat-section max-w-3xl mx-auto mb-8 px-4 flex flex-col gap-4"
    >
      {message.role === "user" ? (
        <UserMessage message={message} />
      ) : (
        <AnswerSection message={message} />
      )}
    </div>
  );
});
MessageRenderer.displayName = "MessageRenderer";

/**
 * Renders the list of messages by subscribing to the list of message IDs.
 * It doesn't re-render when individual messages change.
 */
const MessageList = () => {
  const messageIds = useAtomValue(messageIdsAtom);
  const isGenerating = useAtomValue(isGeneratingAtom);
  const hitMaxSteps = useAtomValue(hitMaxStepsAtom);
  const lastMessageRole = useAtomValue(lastMessageRoleAtom);

  return (
    <>
      {messageIds.map((id) => (
        <MessageRenderer key={id} messageId={id} />
      ))}
      {isGenerating && lastMessageRole === "user" && (
        <div
          data-role="assistant"
          className="group/message chat-section max-w-3xl mx-auto mb-8 px-4 flex flex-col gap-4"
        >
          <AnswerSection isLoading={true} />
        </div>
      )}
      {hitMaxSteps && (
        <div className="chat-section max-w-3xl mx-auto mb-8 px-4 flex items-center gap-2 text-sm text-ui-fg-base">
          ⚠️ Halted after the maximum tool steps. Type
          <kbd className="rounded bg-gray-400 px-1">Continue</kbd> to keep
          going.
        </div>
      )}
    </>
  );
};

// --- Main Chat Component ---

function ChatInternal({ threadId }: { threadId: Id<"threads"> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const userHasScrolledUp = useRef(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [_viewportHeight, setViewportHeight] = useState(0);

  const messageIds = useAtomValue(messageIdsAtom);

  // Improved viewport handling for Safari keyboard
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use visualViewport when available (better for keyboard handling)
      let vh = window.innerHeight;

      if (window.visualViewport) {
        vh = window.visualViewport.height;
      }

      setViewportHeight(vh);

      // Set CSS custom property
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${vh}px`,
      );
      document.documentElement.style.setProperty(
        "--input-height",
        `${inputHeight}px`,
      );
    };

    updateViewportHeight();

    // Use visualViewport events when available
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewportHeight);
      // Also listen for scroll events on visual viewport
      window.visualViewport.addEventListener("scroll", updateViewportHeight);
    } else {
      // Fallback for browsers without visualViewport
      window.addEventListener("resize", updateViewportHeight);
      window.addEventListener("orientationchange", () => {
        // Delay to ensure orientation change is complete
        setTimeout(updateViewportHeight, 100);
      });
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          updateViewportHeight,
        );
        window.visualViewport.removeEventListener(
          "scroll",
          updateViewportHeight,
        );
      } else {
        window.removeEventListener("resize", updateViewportHeight);
        window.removeEventListener("orientationchange", updateViewportHeight);
      }
    };
  }, [inputHeight]);

  // Rest of your component code remains the same...
  const scrollToBottom = useCallback(
    (behavior: "smooth" | "instant" = "instant") => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }
    },
    [],
  );

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      userHasScrolledUp.current = !isAtBottom;
      setShowScrollDownButton(!isAtBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userHasScrolledUp.current) {
      scrollToBottom("instant");
    } else {
      setShowScrollDownButton(true);
    }
  }, [messageIds.length, scrollToBottom]);

  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const handleSubmit = useCallback(
    (prompt: string, files: ProcessedFile[]) => {
      if (prompt.trim() === "" && files.length === 0) return;

      userHasScrolledUp.current = false;
      setShowScrollDownButton(false);

      const filesForBackend = files.map((f) => ({
        fileId: f.fileId as Id<"files">,
      }));

      sendMessage({
        threadId,
        prompt,
        files: filesForBackend,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).catch((error: any) => {
        const errorMessage =
          typeof error.data === "string"
            ? error.data
            : error.data?.message || error.message;
        if (errorMessage?.includes("MESSAGE_LIMIT_EXCEEDED")) {
          setShowUpgradeModal(true);
        } else {
          toast.error("An unexpected error occurred. Please try again later.");
        }
      });
    },
    [sendMessage, threadId],
  );

  const handleScrollToBottomClick = useCallback(() => {
    userHasScrolledUp.current = false;
    setShowScrollDownButton(false);
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  return (
    <>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
      <SyncToJotai key={threadId} threadId={threadId} />

      {/* Updated chat container with better mobile handling */}
      <div className="grid grid-rows-[1fr_auto] w-full h-[90dvh] chat-main-container">
        <Toaster />
        {/* Messages scroll container */}
        <div
          id="scroll-container"
          ref={scrollContainerRef}
          role="list"
          aria-roledescription="chat messages"
          className="overflow-auto chat-scroll-container"
          style={{
            // paddingLeft: "env(safe-area-inset-left)",
            // paddingRight: "env(safe-area-inset-right)",
            paddingBottom: "40px",
          }}
        >
          <MessageList />
        </div>

        {/* Chat input panel with improved positioning */}

        <ChatPanel
          handleSubmit={handleSubmit}
          onInputHeightChange={setInputHeight}
          showScrollToBottomButton={showScrollDownButton}
          onScrollToBottom={handleScrollToBottomClick}
          threadId={threadId}
        />
      </div>
    </>
  );
}

export function Chat({ threadId }: { threadId: Id<"threads"> }) {
  return (
    <JotaiProvider>
      <ChatInternal threadId={threadId} />
    </JotaiProvider>
  );
}
