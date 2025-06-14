import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ChatMessages } from "./ChatMessages";
import { ChatPanel } from "./ChatPanel";
import { Id } from "@cvx/_generated/dataModel";

interface ChatSection {
  id: string;
  userMessage: UIMessage;
  assistantMessages: UIMessage[];
}

export function Chat({ threadId }: { threadId: Id<"threads"> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [input, setInput] = useState("");
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

  // Convert messages to sections
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = [];
    let currentSection: ChatSection | null = null;

    for (const message of toUIMessages(messages.results ?? [])) {
      if (message.role === "user") {
        if (currentSection) {
          result.push(currentSection);
        }
        currentSection = {
          id: message.key,
          userMessage: message,
          assistantMessages: [],
        };
      } else if (currentSection && message.role === "assistant") {
        currentSection.assistantMessages.push(message);
      }
    }

    if (currentSection) {
      result.push(currentSection);
    }

    return result;
  }, [messages.results]);

  const handleScrollPositionChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() === "") return;

      sendMessage({ threadId, prompt: input });
      setInput("");
    },
    [input, sendMessage, threadId],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  return (
    <>
      <ChatMessages
        inputHeight={inputHeight}
        sections={sections}
        scrollContainerRef={scrollContainerRef}
      />
      <ChatPanel
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={messages.isLoading}
        onInputHeightChange={setInputHeight}
        showScrollToBottomButton={!isAtBottom}
        onScrollToBottom={scrollToBottom}
      />
    </>
  );
}
