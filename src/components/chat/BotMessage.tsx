import { cn } from "@/lib/utils";

export function BotMessage({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose-sm prose-neutral prose-a:text-accent-foreground/50",
        className,
      )}
    >
      {message}
    </div>
  );
}

