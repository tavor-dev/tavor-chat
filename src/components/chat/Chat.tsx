import { cn } from "@/lib/utils";
import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
} from "@convex-dev/agent/react";
import { Doc, Id } from "@cvx/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  cacheThreadMessages,
  getCachedThreadMessages,
} from "@/lib/threadCache";
import { AnswerSection } from "./AnswerSection";
import { ChatPanel } from "./ChatPanel";
import { UserMessage } from "./UserMessage";

export function Chat({ threadId }: { threadId: Id<"threads"> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Controls the visibility of the "scroll to bottom" button.
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  // Tracks if the user has intentionally scrolled up, to disable auto-scroll.
  const userHasScrolledUp = useRef(false);
  const [inputHeight, setInputHeight] = useState(0);

  // Load initial messages from cache to show something immediately.
  const [cachedMessages, setCachedMessages] = useState<
    Doc<"messages">[] | null
  >(() => getCachedThreadMessages(threadId));

  // Refetch from cache if threadId changes (when navigating between chats).
  useEffect(() => {
    setCachedMessages(getCachedThreadMessages(threadId));
  }, [threadId]);

  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 50, stream: true },
  );

  // When server data arrives, update the cache.
  useEffect(() => {
    if (!messages.isLoading && messages.results) {
      cacheThreadMessages(threadId, messages.results);
    }
  }, [messages.isLoading, messages.results, threadId]);

  const messagesToRender = toUIMessages(
    // If loading and we have a cache, use it. Otherwise, use server results.
    messages.isLoading && cachedMessages
      ? cachedMessages
      : (messages.results ?? []),
  );

  // Get the content of the last message to use as a dependency.
  // This is more stable than the entire messages array during streaming.
  const lastMessageContent = messagesToRender.at(-1)?.content;

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

  // Effect for handling manual scroll to show/hide the button.
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;

      // Update the ref that tracks user's intent.
      userHasScrolledUp.current = !isAtBottom;

      // Update the state that shows/hides the button.
      setShowScrollDownButton(!isAtBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Effect for auto-scrolling when new messages (or chunks) arrive.
  useEffect(() => {
    // We only auto-scroll if the user has NOT manually scrolled up.
    if (!userHasScrolledUp.current) {
      scrollToBottom("instant");
    } else {
      // If the user has scrolled up, a new message means they are now even
      // further from the bottom. We should ensure the button is visible.
      // This handles new streaming content pushing the view up without a scroll event.
      setShowScrollDownButton(true);
    }
  }, [lastMessageContent, scrollToBottom]);

  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (prompt.trim() === "") return;
      // On submission, we want to resume auto-scrolling.
      userHasScrolledUp.current = false;
      setShowScrollDownButton(false);
      sendMessage({ threadId, prompt });
    },
    [sendMessage, threadId],
  );

  const handleScrollToBottomClick = useCallback(() => {
    // When the user clicks the button, they intentionally go to the bottom.
    userHasScrolledUp.current = false;
    setShowScrollDownButton(false);
    scrollToBottom("smooth"); // Use smooth scroll for a better UX.
  }, [scrollToBottom]);

  return (
    <>
      <div
        id="scroll-container"
        ref={scrollContainerRef}
        role="list"
        aria-roledescription="chat messages"
        className={cn(
          "w-full pt-14 absolute overflow-y-scroll h-screen inset-0",
          messagesToRender.length > 0 ? "flex-1" : "",
        )}
        style={{
          paddingBottom: inputHeight + 76,
        }}
      >
        {messagesToRender.length > 0 &&
          messagesToRender.map((m) => (
            <div
              key={m.id}
              data-role={m.role}
              className="group/message chat-section max-w-3xl mx-auto mb-8 px-4 flex flex-col gap-4"
            >
              {m.role === "user" ? (
                <UserMessage message={m} />
              ) : (
                <AnswerSection message={m} />
              )}
            </div>
          ))}
      </div>
      <ChatPanel
        handleSubmit={handleSubmit}
        isLoading={messages.isLoading}
        onInputHeightChange={setInputHeight}
        showScrollToBottomButton={showScrollDownButton}
        onScrollToBottom={handleScrollToBottomClick}
      />
    </>
  );
}
