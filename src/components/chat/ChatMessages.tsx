import { cn } from "@/lib/utils";
import { AnswerSection } from "./AnswerSection";
import { UserMessage } from "./UserMessage";

interface ChatSection {
  id: string;
  userMessage: any;
  assistantMessages: any[];
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
        "relative size-full pt-14",
        sections.length > 0 ? "flex-1 overflow-y-auto" : "",
      )}
    >
      <div className="relative mx-auto w-full max-w-3xl px-4">
        {sections.map((section) => (
          <div
            key={section.id}
            id={`section-${section.id}`}
            className="chat-section mb-8"
          >
            {/* User message */}
            <div className="flex flex-col gap-4 mb-4">
              <UserMessage message={section.userMessage.content} />
            </div>

            {/* Assistant messages */}
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
    </div>
  );
}

