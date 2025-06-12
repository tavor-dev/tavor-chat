import { Copy } from "lucide-react";
import { Button } from "@medusajs/ui";

interface MessageActionsProps {
  content: string;
}

export function MessageActions({ content }: MessageActionsProps) {
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
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
    </div>
  );
}

