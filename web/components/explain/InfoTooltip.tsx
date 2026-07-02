"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BADGE_EXPLANATIONS,
  METRIC_EXPLANATIONS,
  type ExplainBadgeKey,
  type ExplainMetricKey,
} from "@/lib/explain";
import { cn } from "@/lib/utils";

/**
 * Explainability tooltip primitives. Interaction hierarchy:
 * Tooltip = short definition · HoverCard = rich preview · Drawer = deep dive.
 *
 * Triggers open on hover AND keyboard focus (base-ui handles both), so
 * tooltip content is reachable without a mouse. The same copy also lives on
 * the methodology page, so tooltips are never the only path to it.
 */

interface InfoTooltipProps {
  /** Tooltip body. Keep it to a sentence or two. */
  content: React.ReactNode;
  /** Bold first line inside the tooltip (usually the term being defined). */
  title?: string;
  /** The visible trigger. Receives hover/focus handlers via base-ui render. */
  children: React.ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom" | "left" | "right";
}

/** Wrap any element with a definition tooltip. */
export function InfoTooltip({ content, title, children, side = "top" }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="block max-w-[260px] px-3 py-2 leading-relaxed">
        {title ? (
          <span className="mb-0.5 block font-semibold text-foreground">{title}</span>
        ) : null}
        <span className="block text-popover-foreground/80">{content}</span>
      </TooltipContent>
    </Tooltip>
  );
}

interface MetricTooltipProps {
  metric: ExplainMetricKey;
  /**
   * Custom trigger. Defaults to the metric's label with a help underline.
   * Pass `focusable` when the trigger is NOT already inside an interactive
   * element and should join the tab order.
   */
  children?: React.ReactElement<Record<string, unknown>>;
  focusable?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/** A metric label that explains itself: dotted help underline + definition tooltip. */
export function MetricTooltip({
  metric,
  children,
  focusable = false,
  side = "top",
  className,
}: MetricTooltipProps) {
  const { label, description } = METRIC_EXPLANATIONS[metric];
  const trigger = children ?? (
    <span
      tabIndex={focusable ? 0 : undefined}
      aria-label={`${label}: ${description}`}
      className={cn(
        "cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      {label}
    </span>
  );
  return (
    <InfoTooltip title={label} content={description} side={side}>
      {trigger}
    </InfoTooltip>
  );
}

interface BadgeTooltipProps {
  badge: ExplainBadgeKey;
  /** The badge element itself — its visible text is the accessible label. */
  children: React.ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom" | "left" | "right";
}

/** Wraps a status badge with its centralized explanation. */
export function BadgeTooltip({ badge, children, side = "top" }: BadgeTooltipProps) {
  const { label, description } = BADGE_EXPLANATIONS[badge];
  return (
    <InfoTooltip title={label} content={description} side={side}>
      {children}
    </InfoTooltip>
  );
}
