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
}

/** Label, big tabular value, optional sub-line and info tooltip — the dashboard's base building block. */
export function MetricCard({ label, value, sub, tooltip, className }: MetricCardProps) {
  return (
    <Card className={cn("gap-2 border-border bg-card py-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-default text-muted-foreground/70">
                  <Info className="h-3.5 w-3.5" />
                </span>
              }
            />
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </CardHeader>
      <CardContent className="px-4">
        <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
