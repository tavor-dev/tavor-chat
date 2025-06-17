import { useSmoothText } from "@convex-dev/agent/react";
import { Button, Textarea } from "@medusajs/ui";
import { useCallback, useState } from "react";
import { MessageActions } from "./MessageActions";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Id } from "@cvx/_generated/dataModel";
import { PaperClip } from "@medusajs/icons";
import { type UIMessage } from "@/lib/toUIMessages";
import { type FileUIPart } from "@cvx/chat_engine/mapping";

type UserMessageProps = {
  message: UIMessage;
};

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [visibleText] = useSmoothText(message.content);
  const editMessage = useMutation(api.messages.editMessage);

  const handleSave = useCallback(() => {
    editMessage({
      messageId: message.id as Id<"messages">,
      content: editedContent,
    });
    setIsEditing(false);
  }, [editedContent, editMessage, message.id]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const attachedFiles = message.parts.filter(
    (part) => part.type === "file",
  ) as FileUIPart[];

  if (isEditing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-lg">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="rounded-lg px-4 py-2 w-full text-base"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" size="small" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="small" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end p-5">
      <div className="flex flex-col items-end">
        {attachedFiles && attachedFiles.length > 0 && (
          <div className="mb-2 w-full rounded-lg border border-ui-border-base bg-ui-bg-subtle">
            <div className="flex flex-col gap-2">
              {attachedFiles.map((part, i) => (
                <div
                  key={message.key + i + Math.random()}
                  className="flex items-center gap-2 text-sm"
                >
                  {part.mimeType.startsWith("image/") ? (
                    <img
                      src={part.data}
                      className="max-h-40 max-w-xs rounded-lg border border-ui-border-base shadow-md"
                    />
                  ) : (
                    <div className="p-2 flex items-center gap-2 max-h-40 max-w-xs shadow-md">
                      <PaperClip className="text-ui-fg-muted" />
                      <a
                        href={part.data}
                        className="truncate text-ui-fg-subtle"
                      >
                        {part.filename ?? "File"}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {visibleText && (
          <div className="bg-ui-bg-base rounded-lg px-4 py-2 max-w-lg whitespace-pre-wrap break-words shadow-md">
            {visibleText}
          </div>
        )}
        <MessageActions message={message} onEdit={() => setIsEditing(true)} />
      </div>
    </div>
  );
};
