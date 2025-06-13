import { Copy } from "lucide-react";
import { Button } from "@medusajs/ui";
import { ChannelsSolid } from "@medusajs/icons";

interface MessageActionsProps {
  content: string;
}

export function MessageActions({ content }: MessageActionsProps) {
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
  }

  function handleFork() {
    // TODO: Implement fork functionality
    console.log("Fork clicked");
  }

  return (
    <div className="flex items-center gap-0.5 self-end mt-4">
      <Button
        variant="transparent"
        size="small"
        onClick={handleCopy}
        className=""
      >
        <Copy size={14} />
      </Button>
      <Button
        variant="transparent"
        size="small"
        onClick={handleFork}
        className=""
      >
        <ChannelsSolid />
      </Button>
    </div>
  );
}

