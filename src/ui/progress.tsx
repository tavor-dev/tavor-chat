import React from "react";
import { clx } from "@medusajs/ui";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: "green" | "red" | "orange" | "yellow" | "blue" | "purple";
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, color = "blue" }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const colorClasses = {
      green: "bg-ui-tag-green-bg",
      red: "bg-ui-tag-red-bg",
      orange: "bg-ui-tag-orange-bg",
      yellow: "bg-ui-tag-yellow-bg",
      blue: "bg-ui-bg-interactive",
      purple: "bg-ui-tag-purple-bg",
    };

    return (
      <div
        ref={ref}
        className={clx(
          "relative h-2 w-full overflow-hidden rounded-full bg-ui-bg-subtle",
          className,
        )}
      >
        <div
          className={clx(
            "h-full rounded-full transition-all duration-300 ease-out",
            colorClasses[color],
          )}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    );
  },
);

Progress.displayName = "Progress";
