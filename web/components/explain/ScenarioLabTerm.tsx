"use client";

import { InfoTooltip } from "@/components/explain/InfoTooltip";
import {
  SCENARIO_LAB_EXPLANATIONS,
  type ScenarioLabTermKey,
} from "@/lib/scenarioLabExplain";
import { cn } from "@/lib/utils";

interface ScenarioLabTermProps {
  term: ScenarioLabTermKey;
  className?: string;
}

/** Dotted-underline Scenario Lab term with centralized tooltip copy. */
export function ScenarioLabTerm({ term, className }: ScenarioLabTermProps) {
  const { label, description } = SCENARIO_LAB_EXPLANATIONS[term];
  return (
    <InfoTooltip title={label} content={description}>
      <span
        tabIndex={0}
        className={cn(
          "cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
      >
        {label}
      </span>
    </InfoTooltip>
  );
}
