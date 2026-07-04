import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  BadgeTooltip,
  MetricTooltip,
} from "@/components/explain/InfoTooltip";
import type { ExplainBadgeKey, ExplainMetricKey } from "@/lib/explain";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { metricLabel, metricValueLg } from "@/lib/typography";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Centralized metric definition from explain.ts. */
  explainMetric?: ExplainMetricKey;
  /** Centralized badge definition from explain.ts. */
  explainBadge?: ExplainBadgeKey;
  className?: string;
  /** Makes the whole card an interactive button (e.g. jump to a team's resume drawer). */
  onClick?: () => void;
}

/** Label, big tabular value, optional sub-line and info tooltip — the dashboard's base building block. */
export function MetricCard({
  label,
  value,
  sub,
  explainMetric,
  explainBadge,
  className,
  onClick,
}: MetricCardProps) {
  const infoTrigger = (
    <button
      type="button"
      className="inline-flex rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`About ${label}`}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
  const card = (
    <Card
      className={cn(
        "gap-2 border-border bg-card py-4",
        onClick &&
          "cursor-pointer transition-colors duration-150 hover:border-primary/30",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <span className={metricLabel}>{label}</span>
        {explainMetric ? (
          <MetricTooltip metric={explainMetric}>{infoTrigger}</MetricTooltip>
        ) : explainBadge ? (
          <BadgeTooltip badge={explainBadge}>{infoTrigger}</BadgeTooltip>
        ) : null}
      </CardHeader>
      <CardContent className="px-4">
        <div className={metricValueLg}>{value}</div>
        {sub ? (
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!onClick) return card;

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {card}
    </button>
  );
}
