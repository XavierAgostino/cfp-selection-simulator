"use client";

import * as React from "react";
import {
  redistributePercents,
  WEIGHT_KEYS,
  type WeightPercents,
} from "@/lib/scenarioWeights";
import { cn } from "@/lib/utils";

interface MetricConfig {
  key: (typeof WEIGHT_KEYS)[number];
  label: string;
  full: string;
  /** CSS var for the accent + segment fill (monochrome ramp from ScoreBars). */
  color: string;
  fill: string;
}

const METRICS: MetricConfig[] = [
  { key: "resume", label: "Resume", full: "Quality of results so far", color: "var(--bar-resume)", fill: "bg-bar-resume" },
  { key: "predictive", label: "Predictive", full: "Projected team strength", color: "var(--bar-predictive)", fill: "bg-bar-predictive" },
  { key: "sor", label: "SOR", full: "Strength of record", color: "var(--bar-sor)", fill: "bg-bar-sor" },
  { key: "sos", label: "SOS", full: "Strength of schedule", color: "var(--bar-sos)", fill: "bg-bar-sos" },
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
  return (
    <div className="flex flex-col gap-5">
      {/* Live proportion bar — the readout of how the composite is mixed. */}
      <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-foreground/10">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className={cn(metric.fill, "h-full transition-[width] duration-300 ease-out")}
            style={{ width: `${percents[metric.key]}%` }}
            aria-hidden
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {METRICS.map((metric) => {
          const value = percents[metric.key];
          return (
            <div key={metric.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full ring-1 ring-foreground/10"
                    style={{ backgroundColor: metric.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground">
                    {metric.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.full}</span>
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
                aria-label={`${metric.label} weight, ${value} percent`}
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
