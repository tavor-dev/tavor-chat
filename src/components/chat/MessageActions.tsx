import { Copy } from "@medusajs/ui";
import { Tooltip, TooltipProvider } from "@medusajs/ui";
import { ChannelsSolid, ArrowPath, Pencil } from "@medusajs/icons";

interface MessageActionsProps {
  content: string;
  onEdit?: () => void;
}

export function MessageActions({ content, onEdit }: MessageActionsProps) {
  function handleFork() {
    // TODO: Implement fork functionality
    console.log("Fork clicked");
  }

  function handleRegenerate() {
    // TODO: Implement regenerate functionality
    console.log("Regenerate clicked");
  }

  return (
    <div className="flex items-center gap-4 self-end mt-4 mr-2 transition-opacity opacity-0 group-hover/message:opacity-100">
      <TooltipProvider>
        <Copy content={content} />

        <Tooltip content="Edit" onClick={onEdit}>
          <Pencil className="text-ui-fg-subtle cursor-pointer hidden group-data-[role=user]/message:block" />
        </Tooltip>

        <Tooltip content="Retry">
          <ArrowPath className="text-ui-fg-subtle cursor-pointer" />
        </Tooltip>

        <Tooltip content="Fork">
          <ChannelsSolid className="text-ui-fg-subtle cursor-pointer group-data-[role=user]/message:hidden" />
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
