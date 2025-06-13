import { cn } from "@/lib/utils";
import { Text } from "@medusajs/ui";

export function BotMessage({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return <Text className={cn("", "", "", className)}>{message}</Text>;
}
