import { BotMessage } from "./BotMessage";
import { MessageActions } from "./MessageActions";

type AnswerSectionProps = {
  content: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnswerSection({
  content,
  isOpen,
  onOpenChange,
}: AnswerSectionProps) {
  return (
    <div className="p-4">
      <BotMessage message={content} />
      <MessageActions content={content} />
    </div>
  );
}

