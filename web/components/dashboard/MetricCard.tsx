import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tooltip?: string;
  className?: string;
  /** Makes the whole card an interactive button (e.g. jump to a team's resume drawer). */
  onClick?: () => void;
}

/** Label, big tabular value, optional sub-line and info tooltip — the dashboard's base building block. */
export function MetricCard({
  label,
  value,
  sub,
  tooltip,
  className,
  onClick,
}: MetricCardProps) {
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
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`About ${label}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              }
            />
            <TooltipContent side="top" className="max-w-[220px]">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </div>
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
