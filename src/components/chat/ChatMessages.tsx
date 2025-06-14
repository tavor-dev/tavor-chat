import { cn } from "@/lib/utils";
import { AnswerSection } from "./AnswerSection";
import { UserMessage } from "./UserMessage";
import type { UIMessage } from "@convex-dev/agent/react";

interface ChatSection {
  id: string;
  userMessage: UIMessage;
  assistantMessages: UIMessage[];
}

interface ChatMessagesProps {
  sections: ChatSection[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputHeight: number;
}

export function ChatMessages({
  sections,
  scrollContainerRef,
  inputHeight,
}: ChatMessagesProps) {
  if (!sections.length) return null;

  return (
    <div
      id="scroll-container"
      ref={scrollContainerRef}
      role="list"
      aria-roledescription="chat messages"
      className={cn(
        "w-full pt-14 absolute overflow-y-scroll h-screen inset-0",
        sections.length > 0 ? "flex-1" : "",
      )}
      style={{
        paddingBottom: inputHeight + 56,
      }}
    >
      {sections.map((section) => (
        <div
          key={section.id}
          id={`section-${section.id}`}
          className="chat-section max-w-3xl mx-auto mb-8 px-4"
        >
          <div className="flex flex-col gap-4 mb-4">
            <UserMessage message={section.userMessage} />
          </div>
          {section.assistantMessages.map((assistantMessage) => (
            <div key={assistantMessage.key} className="flex flex-col gap-4">
              <AnswerSection
                content={assistantMessage.content}
                isOpen={true}
                onOpenChange={() => {}}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
