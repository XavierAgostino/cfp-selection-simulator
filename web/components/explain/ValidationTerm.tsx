"use client";

import { InfoTooltip } from "@/components/explain/InfoTooltip";
import {
  VALIDATION_EXPLANATIONS,
  type ValidationTermKey,
} from "@/lib/validationExplain";
import { cn } from "@/lib/utils";

interface ValidationTermProps {
  term: ValidationTermKey;
  className?: string;
  /** Override visible label while keeping tooltip copy from the term. */
  overrideLabel?: string;
}

/** Dotted-underline validation metric with centralized tooltip copy. */
export function ValidationTerm({
  term,
  className,
  overrideLabel,
}: ValidationTermProps) {
  const { label, description } = VALIDATION_EXPLANATIONS[term];
  const visible = overrideLabel ?? label;
  return (
    <InfoTooltip title={label} content={description}>
      <span
        tabIndex={0}
        className={cn(
          "cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
      >
        {visible}
      </span>
    </InfoTooltip>
  );
}
