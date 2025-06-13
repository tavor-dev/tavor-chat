import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  optimisticallySendMessage,
  toUIMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useThreadMessages } from "@convex-dev/agent/react";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./ChatMessages";
import { ChatPanel } from "./ChatPanel";

// Define section structure
interface ChatSection {
  id: string; // User message ID
  userMessage: UIMessage;
  assistantMessages: UIMessage[];
}

export function Chat({ threadId }: { threadId: string }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [input, setInput] = useState("");

  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 50, stream: true },
  );

  const scrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
    }
  };

  useEffect(() => {
    if (messages.results?.length > 0) {
      scrollToBottom();
    }
  }, [messages.results]);

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
    <div
      className={cn(
        "relative flex h-full min-w-0 flex-1 flex-col",
        sections.length === 0 ? "items-center justify-end" : "",
      )}
      data-testid="full-chat"
    >
      <ChatMessages
        sections={sections}
        scrollContainerRef={scrollContainerRef}
      />

      <ChatPanel
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={messages.isLoading}
        showScrollToBottomButton={!isAtBottom}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
}
