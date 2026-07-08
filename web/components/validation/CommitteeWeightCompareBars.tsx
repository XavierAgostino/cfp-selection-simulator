import { toCompareRows } from "@/lib/committeeWeightCharts";
import type { FittedWeights } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Paired baseline vs fit-approximation bars for the 2025 final card. This is an
 * explanatory glance, not a proof — the exact factor table sits directly below.
 *
 * Distinction is carried by fill (ghosted baseline vs solid gold fit) AND text
 * labels, never colour alone. Bars grow on mount via a CSS keyframe that the
 * global prefers-reduced-motion backstop collapses to instant, so reduced-motion
 * viewers get the final widths with no path-drawing.
 */
export function CommitteeWeightCompareBars({
  baseline,
  fitted,
}: {
  baseline: FittedWeights;
  fitted: FittedWeights;
}) {
  const rows = toCompareRows(baseline, fitted);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Weight comparison
        </span>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-4 rounded-full bg-muted-foreground/25 ring-1 ring-inset ring-muted-foreground/40"
            />
            Baseline
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-4 rounded-full bg-accent-gold" />
            Fit approximation
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {rows.map((row, index) => (
          <div
            key={row.key}
            role="img"
            aria-label={row.ariaLabel}
            className="flex flex-col gap-1"
          >
            <span
              aria-hidden
              className="text-[13px] font-semibold text-foreground"
            >
              {row.label}
            </span>

            <CompareBar
              seriesLabel="Baseline"
              pct={row.baselinePct}
              variant="baseline"
              delayMs={index * 60}
            />
            <CompareBar
              seriesLabel="Fit approximation"
              pct={row.fittedPct}
              variant="fitted"
              delayMs={index * 60 + 30}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareBar({
  seriesLabel,
  pct,
  variant,
  delayMs,
}: {
  seriesLabel: string;
  pct: number;
  variant: "baseline" | "fitted";
  delayMs: number;
}) {
  const isFitted = variant === "fitted";
  return (
    <div
      aria-hidden
      className="grid grid-cols-[6.5rem_1fr_2.25rem] items-center gap-2"
    >
      <span
        className={cn(
          "text-[11px]",
          isFitted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {seriesLabel}
      </span>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-bar-track/60">
        <div
          className={cn(
            "h-full rounded-full",
            isFitted
              ? "bg-accent-gold"
              : "bg-muted-foreground/25 ring-1 ring-inset ring-muted-foreground/40",
          )}
          style={{
            width: `${pct}%`,
            animation: "ct-bar-grow 700ms ease-out backwards",
            animationDelay: `${delayMs}ms`,
          }}
        />
      </div>
      <span
        className={cn(
          "text-right text-xs tabular-nums",
          isFitted ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
