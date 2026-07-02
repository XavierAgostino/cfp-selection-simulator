import { cn } from "@/lib/utils";
import {
  SCORE_BAR_TRACK_CLASS,
  SCORE_METRIC_BAR_STYLES,
  scoreBarWidth,
  type ScoreMetricKey,
} from "@/lib/scoreBars";

interface ScoreBarProps {
  value: number;
  metric?: ScoreMetricKey;
  /** Override fill when not tied to a named metric (e.g. generic gray). */
  fillClass?: string;
  size?: "sm" | "md";
  /** Emphasize this bar while a sibling metric is hovered. */
  highlighted?: boolean;
  className?: string;
}

/** Inline progress bar for tables and resume panels. */
export function ScoreBar({
  value,
  metric = "composite",
  fillClass,
  size = "sm",
  highlighted = false,
  className,
}: ScoreBarProps) {
  const fill =
    fillClass ?? SCORE_METRIC_BAR_STYLES[metric]?.fillClass ?? "bg-bar-resume";

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full",
        SCORE_BAR_TRACK_CLASS,
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-opacity duration-300 ease-out",
          fill,
          highlighted ? "opacity-100" : "opacity-80",
        )}
        style={{ width: scoreBarWidth(value) }}
      />
    </div>
  );
}
