import { cn } from "@/lib/utils";
import type { FreshnessTone, RunFreshnessInfo } from "@/lib/runDisplay";

/** Dot + label colors per tone, drawn from the shared tag palette. */
const toneStyles: Record<FreshnessTone, { dot: string; text: string }> = {
  fresh: { dot: "bg-tag-green-dot", text: "text-tag-green-text" },
  aging: { dot: "bg-tag-gold-dot", text: "text-tag-gold-text" },
  stale: { dot: "bg-tag-red-dot", text: "text-tag-red-text" },
  static: { dot: "bg-muted-foreground/45", text: "text-muted-foreground" },
};

/**
 * Recency indicator for the run header: a status dot in the run's freshness
 * tone plus a relative "updated N days ago" label. The single live+fresh run
 * gets a slow halo pulse (motion-safe only) to read as "current and live";
 * everything else is a still dot. The exact timestamp lives in the tooltip.
 */
export function RunFreshness({ freshness }: { freshness: RunFreshnessInfo }) {
  const tone = toneStyles[freshness.tone];
  const pulsing = freshness.live && freshness.tone === "fresh";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Generated ${freshness.detail}`}
    >
      <span className="relative flex size-1.5 items-center justify-center">
        {pulsing ? (
          <span
            aria-hidden
            className={cn(
              "absolute inline-flex size-full rounded-full opacity-60",
              "motion-safe:animate-ping [animation-duration:2.4s]",
              tone.dot,
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex size-1.5 rounded-full", tone.dot)} />
      </span>
      <span className={cn("font-medium tabular-nums", tone.text)}>
        {freshness.label}
      </span>
    </span>
  );
}
