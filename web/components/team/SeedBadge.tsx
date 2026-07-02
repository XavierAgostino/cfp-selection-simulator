import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { seedChipClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SeedBadgeProps {
  seed: number | null;
  isBye?: boolean;
  className?: string;
}

/** Seed number chip; gold treatment when the team holds a first-round bye (seeds 1-4). */
export function SeedBadge({ seed, isBye = false, className }: SeedBadgeProps) {
  const chip = (
    <Badge
      variant="outline"
      className={cn(
        "h-6 w-6 justify-center rounded-md p-0 font-mono text-xs font-semibold tabular-nums",
        seedChipClassName(seed, isBye),
        className,
      )}
    >
      {seed ?? "—"}
    </Badge>
  );

  if (!isBye || seed === null) return chip;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex cursor-default">{chip}</span>} />
      <TooltipContent>First-round bye — top four seed.</TooltipContent>
    </Tooltip>
  );
}
