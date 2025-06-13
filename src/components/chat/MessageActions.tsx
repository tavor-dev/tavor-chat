import { Copy } from "@medusajs/ui";
import { Button, Tooltip, TooltipProvider } from "@medusajs/ui";
import { ChannelsSolid, ArrowPath } from "@medusajs/icons";

interface MessageActionsProps {
  content: string;
}

export function MessageActions({ content }: MessageActionsProps) {
  function handleFork() {
    // TODO: Implement fork functionality
    console.log("Fork clicked");
  }

  function handleRegenerate() {
    // TODO: Implement regenerate functionality
    console.log("Regenerate clicked");
  }

  return (
    <div className="flex items-center gap-4 self-end mt-4">
      <TooltipProvider>
        <Copy content={content} />
        <Tooltip content="Regenerate">
          <ArrowPath className="text-ui-fg-subtle cursor-pointer" />
        </Tooltip>

        <Tooltip content="Fork">
          <ChannelsSolid className="text-ui-fg-subtle cursor-pointer" />
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
