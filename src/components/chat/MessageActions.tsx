import { Copy } from "@medusajs/ui";
import { Tooltip, TooltipProvider } from "@medusajs/ui";
import { ChannelsSolid, ArrowPath, Pencil } from "@medusajs/icons";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { UIMessage } from "@convex-dev/agent/react";
import { useCallback } from "react";
import { Id } from "@cvx/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";

interface MessageActionsProps {
  message: UIMessage;
  onEdit?: () => void;
}

export function MessageActions({ message, onEdit }: MessageActionsProps) {
  const navigate = useNavigate();
  const forkAt = useMutation(api.messages.forkAt);

  const handleFork = useCallback(async () => {
    const newThreadId = await forkAt({
      messageId: message.id as Id<"messages">,
    });

    navigate({ to: "/chat/$threadId", params: { threadId: newThreadId } });
  }, [message.id]);

  function handleRegenerate() {
    // TODO: Implement regenerate functionality
    console.log("Regenerate clicked");
  }

  return (
    <div className="flex items-center gap-4 self-end mt-4 mr-2 transition-opacity opacity-0 group-hover/message:opacity-100">
      <TooltipProvider>
        <Copy content={message.content} />

        <Tooltip content="Edit" onClick={onEdit}>
          <Pencil className="text-ui-fg-subtle cursor-pointer hidden group-data-[role=user]/message:block" />
        </Tooltip>

        <Tooltip content="Retry">
          <ArrowPath className="text-ui-fg-subtle cursor-pointer" />
        </Tooltip>

        <Tooltip content="Fork" onClick={handleFork}>
          <ChannelsSolid className="text-ui-fg-subtle cursor-pointer group-data-[role=user]/message:hidden" />
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
