import { Copy, Text, Tooltip, TooltipProvider } from "@medusajs/ui";
import { ChannelsSolid, ArrowPath, Pencil } from "@medusajs/icons";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { UIMessage } from "@/lib/agent";
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
  const regenerate = useMutation(api.messages.regenerate);

  const handleFork = useCallback(async () => {
    const newThreadId = await forkAt({
      messageId: message.id as Id<"messages">,
    });

    navigate({ to: "/chat/$threadId", params: { threadId: newThreadId } });
  }, [message.id]);
  const handleRegenerate = useCallback(() => {
    regenerate({ messageId: message.id as Id<"messages"> });
  }, [message.id]);
  
  // Utility to format a Date as HH:mm (24-hour)
function formatTimeHM(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getMessageDate(createdAt: Date | string | number | undefined): Date {
  if (!createdAt) return new Date();
  if (createdAt instanceof Date) return createdAt;
  return new Date(createdAt);
}

  return (
    <div className="flex items-center gap-4 self-end mt-4 mr-2 transition-opacity opacity-0 group-hover/message:opacity-100">
      <TooltipProvider>
        <Tooltip
          content={formatTimeHM(getMessageDate(message.createdAt ?? new Date()))}
        >
          <Text className="text-xs text-ui-fg-subtle">
            {formatTimeHM(getMessageDate(message.createdAt ?? new Date()))}
          </Text>
        </Tooltip>

        <Copy content={message.content} />

        <Tooltip content="Edit" onClick={onEdit}>
          <Pencil className="text-ui-fg-subtle cursor-pointer hidden group-data-[role=user]/message:block" />
        </Tooltip>

        <Tooltip content="Retry" onClick={handleRegenerate}>
          <ArrowPath className="text-ui-fg-subtle cursor-pointer" />
        </Tooltip>

        <Tooltip content="Fork" onClick={handleFork}>
          <ChannelsSolid className="text-ui-fg-subtle cursor-pointer group-data-[role=user]/message:hidden" />
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
