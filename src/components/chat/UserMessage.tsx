import { useSmoothText, type UIMessage } from "@convex-dev/agent/react";
import { Button, Textarea } from "@medusajs/ui";
import { useCallback, useState } from "react";
import { MessageActions } from "./MessageActions";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Id } from "@cvx/_generated/dataModel";
// To make editing functional, you'll need to create and import a Convex mutation for updating messages.
// import { useMutation } from "convex/react";
// import { api } from "@cvx/_generated/api";

type UserMessageProps = {
  message: UIMessage;
};

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [visibleText] = useSmoothText(message.content);
  const editMessage = useMutation(api.messages.editMessage);

  // const updateMessage = useMutation(api.messages.update); // Example mutation

  const handleSave = useCallback(() => {
    editMessage({
      messageId: message.id as Id<"messages">,
      content: editedContent,
    });
    setIsEditing(false);
  }, [editedContent]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  if (isEditing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-lg">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="rounded-lg px-4 py-2 w-full"
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
    <div className="flex justify-end">
      <div className="flex flex-col items-end">
        <div className="bg-ui-bg-base rounded-lg px-4 py-2 max-w-lg whitespace-pre-wrap">
          {visibleText}
        </div>
        <MessageActions message={message} onEdit={() => setIsEditing(true)} />
      </div>
    </div>
  );
};
