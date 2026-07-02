import { formatScore } from "@/lib/format";
import {
  SCORE_METRIC_BAR_STYLES,
  type ScoreMetricKey,
} from "@/lib/scoreBars";
import { cn } from "@/lib/utils";

interface ScoreMetricTooltipProps {
  metric: ScoreMetricKey;
  label: string;
  value: number;
  rank: number;
  description: string;
}

export function ScoreMetricTooltip({
  metric,
  label,
  value,
  rank,
  description,
}: ScoreMetricTooltipProps) {
  const fillClass = SCORE_METRIC_BAR_STYLES[metric].fillClass;

  return (
    <div className="flex w-[228px] flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", fillClass)}
          aria-hidden
        />
        <span className="text-[13px] font-semibold leading-none text-foreground">
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-foreground">
          {formatScore(value)}
        </span>
        <div className="pb-0.5 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-popover-foreground/50">
            Rank
          </p>
          <p className="text-sm font-semibold tabular-nums leading-none text-foreground">
            #{rank}
          </p>
        </div>
      </div>

      <p className="border-t border-border/50 pt-2.5 text-[11px] leading-relaxed text-popover-foreground/70">
        {description}
      </p>
    </div>
  );
}
