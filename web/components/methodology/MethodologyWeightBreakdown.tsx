"use client";

import { MetricTooltip } from "@/components/explain/InfoTooltip";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import { cn } from "@/lib/utils";

type WeightKey = "resume" | "predictive" | "sor" | "sos";

const WEIGHT_ROWS: {
  key: WeightKey;
  barClass: string;
}[] = [
  { key: "resume", barClass: "bg-bar-resume" },
  { key: "predictive", barClass: "bg-bar-predictive" },
  { key: "sor", barClass: "bg-bar-sor" },
  { key: "sos", barClass: "bg-bar-sos" },
];

interface MethodologyWeightBreakdownProps {
  weights: Record<WeightKey, number>;
}

/** Composite weight bars with centralized metric tooltips. */
export function MethodologyWeightBreakdown({
  weights,
}: MethodologyWeightBreakdownProps) {
  return (
    <div className="flex flex-col gap-4">
      {WEIGHT_ROWS.map(({ key, barClass }) => {
        const value = weights[key];
        const { description } = METRIC_EXPLANATIONS[key];
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <MetricTooltip metric={key} focusable className="text-sm font-medium text-foreground" />
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {Math.round(value * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bar-track">
              <div
                className={cn("h-full rounded-full", barClass)}
                style={{ width: `${value * 100}%` }}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        );
      })}
    </div>
  );
}
