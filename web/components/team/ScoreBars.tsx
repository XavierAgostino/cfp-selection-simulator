"use client";

import * as React from "react";
import { ScoreBar } from "@/components/common/ScoreBar";
import { ScoreMetricTooltip } from "@/components/team/ScoreMetricTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import { formatScore } from "@/lib/format";
import type { ScoreMetricKey } from "@/lib/scoreBars";
import type { TeamResume } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ScoreBarRowConfig {
  key: ScoreMetricKey;
  label: string;
  tooltip: string;
}

/** Labels/copy come from the central explain registry so terms read the same sitewide. */
const ROWS: ScoreBarRowConfig[] = (
  ["composite", "resume", "predictive", "sor", "sos"] as ScoreMetricKey[]
).map((key) => ({
  key,
  label: METRIC_EXPLANATIONS[key].label,
  tooltip: METRIC_EXPLANATIONS[key].description,
}));

interface ScoreBarsProps {
  resume: TeamResume;
  className?: string;
}

export function ScoreBars({ resume, className }: ScoreBarsProps) {
  const [activeKey, setActiveKey] = React.useState<ScoreMetricKey | null>(null);

  function activate(key: ScoreMetricKey) {
    setActiveKey(key);
  }

  function deactivate() {
    setActiveKey(null);
  }

  return (
    <TooltipProvider delay={350} closeDelay={120}>
      <div
        className={cn("flex flex-col gap-3", className)}
        onMouseLeave={deactivate}
        onFocus={(event) => {
          const row = (event.target as HTMLElement).closest("[data-metric-key]");
          const key = row?.getAttribute("data-metric-key");
          if (key) activate(key as ScoreMetricKey);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            deactivate();
          }
        }}
      >
        {ROWS.map((row) => {
          const value = resume.scores[row.key];
          const rank =
            row.key === "composite" ? resume.rank : resume.component_ranks[row.key];
          const isActive = activeKey === row.key;
          const isSubdued = activeKey !== null && !isActive;

          return (
            <Tooltip key={row.key} open={isActive}>
              <TooltipTrigger
                render={
                  <div
                    data-metric-key={row.key}
                    role="group"
                    aria-label={`${row.label}: ${formatScore(value)}, rank ${rank}`}
                    tabIndex={0}
                    className={cn(
                      "flex cursor-default flex-col gap-1.5 rounded-md outline-none transition-opacity duration-300 ease-out focus-visible:ring-1 focus-visible:ring-ring/40",
                      isSubdued && "opacity-50",
                    )}
                    onMouseEnter={() => activate(row.key)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "font-medium transition-colors duration-300 ease-out",
                          isActive ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {row.label}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {formatScore(value)} · #{rank}
                      </span>
                    </div>
                    <ScoreBar
                      value={value}
                      metric={row.key}
                      size="md"
                      highlighted={isActive}
                    />
                  </div>
                }
              />
              <TooltipContent
                side="top"
                align="start"
                sideOffset={12}
                hideArrow
                className="pointer-events-none rounded-lg border-border/50 bg-popover/95 px-3.5 py-3 shadow-xl backdrop-blur-sm transition-opacity duration-200 ease-out data-open:animate-none data-open:fade-in-0 data-open:zoom-in-100 data-closed:animate-none data-closed:fade-out-0 data-closed:zoom-out-100"
              >
                <ScoreMetricTooltip
                  metric={row.key}
                  label={row.label}
                  value={value}
                  rank={rank}
                  description={row.tooltip}
                />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
