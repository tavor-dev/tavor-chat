import type { UIMessage } from "@/lib/agent";
import { BotMessage } from "./BotMessage";
import { MessageActions } from "./MessageActions";

type AnswerSectionProps = {
  message?: UIMessage;
  isLoading?: boolean;
};

export function AnswerSection({ message, isLoading }: AnswerSectionProps) {
  if (isLoading) {
    return (
      <div className="p-2">
        <BotMessage isLoading={true} />
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="p-5">
      <BotMessage message={message} />
      {!message.error && <MessageActions message={message} />}
    </div>
  );
}
