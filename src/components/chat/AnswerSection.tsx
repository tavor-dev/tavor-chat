import { UIMessage } from "@convex-dev/agent/react";
import { BotMessage } from "./BotMessage";
import { MessageActions } from "./MessageActions";

type AnswerSectionProps = {
  message: UIMessage;
};

export function AnswerSection({ message }: AnswerSectionProps) {
  return (
    <div className="p-4">
      <BotMessage message={message} />
      <MessageActions content={message.content} />
    </div>
  );
}
