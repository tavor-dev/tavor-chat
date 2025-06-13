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
}

export function ChatMessages({
  sections,
  scrollContainerRef,
}: ChatMessagesProps) {
  if (!sections.length) return null;

  return (
    <div
      id="scroll-container"
      ref={scrollContainerRef}
      role="list"
      aria-roledescription="chat messages"
      className={cn(
        "relative w-full max-w-3xl mx-auto flex-1 overflow-y-auto pt-14 h-[calc(100vh-200px)]",
        sections.length > 0 ? "flex-1" : "",
      )}
    >
      {sections.map((section) => (
        <div
          key={section.id}
          id={`section-${section.id}`}
          className="chat-section mb-8 px-4"
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
