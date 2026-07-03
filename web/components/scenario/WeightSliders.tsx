"use client";

import * as React from "react";
import { MetricTooltip } from "@/components/explain/InfoTooltip";
import { ScenarioLabTerm } from "@/components/explain/ScenarioLabTerm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  redistributePercents,
  WEIGHT_KEYS,
  type WeightPercents,
} from "@/lib/scenarioWeights";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type { ExplainMetricKey } from "@/lib/explain";
import { cn } from "@/lib/utils";

interface MetricConfig {
  key: (typeof WEIGHT_KEYS)[number];
  metric: ExplainMetricKey;
  color: string;
  fill: string;
}

const METRICS: MetricConfig[] = [
  { key: "resume", metric: "resume", color: "var(--bar-resume)", fill: "bg-bar-resume" },
  { key: "predictive", metric: "predictive", color: "var(--bar-predictive)", fill: "bg-bar-predictive" },
  { key: "sor", metric: "sor", color: "var(--bar-sor)", fill: "bg-bar-sor" },
  { key: "sos", metric: "sos", color: "var(--bar-sos)", fill: "bg-bar-sos" },
];

interface WeightSlidersProps {
  percents: WeightPercents;
  onChange: (next: WeightPercents) => void;
  disabled?: boolean;
}

/**
 * The Scenario Lab control surface: a live stacked proportion bar over four
 * sliders. Moving any slider rebalances the others so the four weights always
 * sum to 100 — the model only ever reweights, it never invents probability.
 */
export function WeightSliders({ percents, onChange, disabled }: WeightSlidersProps) {
  const [activeKey, setActiveKey] = React.useState<(typeof WEIGHT_KEYS)[number] | null>(
    null,
  );

  return (
    <div
      className="flex flex-col gap-5"
      onMouseLeave={() => setActiveKey(null)}
    >
      <div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          <ScenarioLabTerm term="normalize_weights" className="normal-case" />
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-foreground/10">
          {METRICS.map((metric) => {
            const value = percents[metric.key];
            const { label, description } = METRIC_EXPLANATIONS[metric.metric];
            const isActive = activeKey === metric.key;
            const isDimmed = activeKey != null && !isActive;

            return (
              <Tooltip key={metric.key}>
                <TooltipTrigger
                  delay={150}
                  render={
                    <button
                      type="button"
                      disabled={disabled}
                      className={cn(
                        metric.fill,
                        "relative h-full min-w-[3px] border-0 p-0 transition-all duration-200 ease-out",
                        "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        isDimmed && "opacity-30 saturate-50",
                        isActive &&
                          "z-10 brightness-125 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]",
                      )}
                      style={{ width: `${value}%` }}
                      onMouseEnter={() => setActiveKey(metric.key)}
                      onFocus={() => setActiveKey(metric.key)}
                      onBlur={() => setActiveKey(null)}
                      aria-label={`${label}: ${value}% of composite weight`}
                    />
                  }
                />
                <TooltipContent side="top" className="block max-w-[240px] px-3 py-2 leading-relaxed">
                  <span className="block font-semibold text-foreground">
                    {label} · {value}%
                  </span>
                  <span className="mt-0.5 block text-popover-foreground/80">{description}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {METRICS.map((metric) => {
          const value = percents[metric.key];
          const isActive = activeKey === metric.key;
          const isDimmed = activeKey != null && !isActive;

          return (
            <div
              key={metric.key}
              className={cn(
                "-mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1.5 transition-all duration-200",
                isActive && "bg-secondary/60 ring-1 ring-foreground/10",
                isDimmed && "opacity-50",
              )}
              onMouseEnter={() => setActiveKey(metric.key)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "inline-block size-2.5 rounded-full ring-1 ring-foreground/10 transition-transform duration-200",
                      isActive && "scale-125 ring-foreground/25",
                    )}
                    style={{ backgroundColor: metric.color }}
                    aria-hidden
                  />
                  <MetricTooltip
                    metric={metric.metric}
                    className="text-sm font-medium text-foreground"
                  />
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {value}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                disabled={disabled}
                aria-label={`${metric.metric} weight, ${value} percent`}
                onChange={(event) =>
                  onChange(
                    redistributePercents(percents, metric.key, Number(event.target.value)),
                  )
                }
                style={{ accentColor: metric.color }}
                className={cn(
                  "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bar-track outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/50",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
