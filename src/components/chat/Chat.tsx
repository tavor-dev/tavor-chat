import { cn } from "@/lib/utils";
import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
} from "@convex-dev/agent/react";
import { Id } from "@cvx/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AnswerSection } from "./AnswerSection";
import { ChatPanel } from "./ChatPanel";
import { UserMessage } from "./UserMessage";

export function Chat({ threadId }: { threadId: Id<"threads"> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [inputHeight, setInputHeight] = useState(0);

  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 50, stream: true },
  );

  const messagesCount = messages.results?.length || 0;

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  }, [scrollContainerRef]);

  useEffect(() => {
    scrollToBottom();
  }, [messagesCount]);

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
          toUIMessages(messages.results ?? []).map((m) => (
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