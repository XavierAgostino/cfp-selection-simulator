import { cn } from "@/lib/utils";
import type { RunSourceTone } from "@/lib/runDisplay";

/**
 * The run header's dominant context signal: one large, color-coded badge that
 * states what kind of data is on screen (real CFBD run, static sample, or a
 * weight-variant scenario) before the reader parses anything else. Presentation
 * only — it reflects the run's source, it doesn't change how the run is loaded.
 */
const toneShell: Record<RunSourceTone, string> = {
  live: "border-tag-green-border bg-tag-green-bg text-tag-green-text",
  sample: "border-tag-gold-border bg-tag-gold-bg text-tag-gold-text",
  scenario: "border-tag-purple-border bg-tag-purple-bg text-tag-purple-text",
};

const toneDot: Record<RunSourceTone, string> = {
  live: "bg-tag-green-dot",
  sample: "bg-tag-gold-dot",
  scenario: "bg-tag-purple-dot",
};

interface RunSourceBadgeProps {
  tone: RunSourceTone;
  label: string;
}

export function RunSourceBadge({ tone, label }: RunSourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
        toneShell[tone],
      )}
    >
      <span className={cn("size-2 rounded-full", toneDot[tone])} aria-hidden />
      {label}
    </span>
  );
}
