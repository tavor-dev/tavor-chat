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
  const [isAtBottom, setIsAtBottom] = useState(true);
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

  const messagesCount = messagesToRender.length;

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesCount, scrollToBottom]);

  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const handleScrollPositionChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (prompt.trim() === "") return;
      sendMessage({ threadId, prompt });
    },
    [sendMessage, threadId],
  );

  return (
    <>
      <div
        id="scroll-container"
        ref={scrollContainerRef}
        role="list"
        aria-roledescription="chat messages"
        className={cn(
          "w-full pt-14 absolute overflow-y-scroll h-screen inset-0",
          messagesCount > 0 ? "flex-1" : "",
        )}
        style={{
          paddingBottom: inputHeight + 56,
        }}
      >
        {messagesCount > 0 &&
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
        showScrollToBottomButton={!isAtBottom}
        onScrollToBottom={scrollToBottom}
      />
    </>
  );
}
