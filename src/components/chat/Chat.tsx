import {
  cacheThreadMessages,
  getCachedThreadMessages,
} from "@/lib/threadCache";
import { toUIMessages, type UIMessage } from "@/lib/agent/toUIMessages";
import { cn } from "@/lib/utils";
import { optimisticallySendMessage, useThreadMessages } from "@/lib/agent";
import { Doc, type Id } from "@cvx/_generated/dataModel";
import { Button, Heading, Prompt, Text, Toaster, toast } from "@medusajs/ui";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AnswerSection } from "./AnswerSection";
import { ChatPanel, type ProcessedFile } from "./ChatPanel";
import { UserMessage } from "./UserMessage";
import { useNavigate } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMaxStepsReached } from "@/hooks/use-max-steps-reached";

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
            You&apos;ve used all your free messages for this period. Please
            upgrade to the Pro plan to continue chatting.
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

export type UIMessageWithFiles = UIMessage & {
  fileIds?: Id<"files">[];
  error?: string;
};

export function Chat({ threadId }: { threadId: Id<"threads"> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const userHasScrolledUp = useRef(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);

  const [cachedMessages, setCachedMessages] = useState<
    Doc<"messages">[] | null
  >(() => getCachedThreadMessages(threadId));

  useEffect(() => {
    setCachedMessages(getCachedThreadMessages(threadId));
  }, [threadId]);

  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 50000, stream: true }, // temp hack to eliminate pagination, will need heuristic
  );

  const { data: thread } = useQuery(
    convexQuery(api.threads.getByIdForCurrentUser, { threadId }),
  );
  const isGenerating = thread?.generating;

  const hitMaxSteps = useMaxStepsReached(
    messages.results,
    !!thread?.generating,
  );

  useEffect(() => {
    if (!messages.isLoading && messages.results) {
      cacheThreadMessages(threadId, messages.results);
    }
  }, [messages.isLoading, messages.results, threadId]);

  const messagesToRender: UIMessageWithFiles[] = useMemo(() => {
    const serverMessages =
      messages.isLoading && cachedMessages
        ? cachedMessages
        : (messages.results ?? []);

    const uiMessages = toUIMessages(serverMessages);

    return uiMessages.map((uiMessage) => {
      const originalMessage = serverMessages.find(
        (m) => m._id === uiMessage.id,
      );
      return {
        ...uiMessage,
        fileIds: originalMessage?.fileIds,
        error: originalMessage?.error,
      };
    });
  }, [messages.results, cachedMessages, messages.isLoading]);

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
    handleScroll();

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userHasScrolledUp.current) {
      scrollToBottom("instant");
    } else {
      setShowScrollDownButton(true);
    }
  }, [lastMessageContent, scrollToBottom, messagesToRender]);

  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const handleSubmit = useCallback(
    (prompt: string, files: ProcessedFile[]) => {
      if (prompt.trim() === "" && files.length === 0) return;

      userHasScrolledUp.current = false;
      setShowScrollDownButton(false);

      const filesForBackend = files.map((f) => ({
        fileId: f.fileId,
      })) as { fileId: Id<"files"> }[];

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
      <Toaster />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
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
        {isGenerating && messagesToRender.at(-1)?.role === "user" && (
          <div
            data-role="assistant"
            className="group/message chat-section max-w-3xl mx-auto mb-8 px-4 flex flex-col gap-4"
          >
            <AnswerSection isLoading={true} />
          </div>
        )}
        {hitMaxSteps && (
          <div className="chat-section max-w-3xl mx-auto mb-8 px-4 flex items-center gap-2 text-sm text-ui-fg-base">
            ⚠️ Halted after the maximum&nbsp;tool steps. Type&nbsp;
            <kbd className="rounded bg-gray-400 px-1">continue</kbd>&nbsp;to
            keep going.
          </div>
        )}
      </div>
      <ChatPanel
        handleSubmit={handleSubmit}
        onInputHeightChange={setInputHeight}
        showScrollToBottomButton={showScrollDownButton}
        onScrollToBottom={handleScrollToBottomClick}
        threadId={threadId}
      />
    </>
  );
}
