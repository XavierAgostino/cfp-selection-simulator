"use client";

import { Badge } from "@/components/ui/badge";
import { BadgeTooltip } from "@/components/explain/InfoTooltip";
import { seedChipVariant } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SeedBadgeProps {
  seed: number | null;
  isBye?: boolean;
  className?: string;
}

/** Seed number chip; gold treatment + BYE explanation when the team holds a first-round bye. */
export function SeedBadge({ seed, isBye = false, className }: SeedBadgeProps) {
  const badge = (
    <Badge
      variant={seedChipVariant(seed, isBye)}
      aria-label={
        seed === null
          ? "No seed"
          : isBye
            ? `Seed ${seed}, first-round bye`
            : `Seed ${seed}`
      }
      className={cn(
        "h-6 w-6 justify-center rounded-md p-0 text-xs font-semibold tabular-nums",
        seed === null && "text-muted-foreground",
        className,
      )}
    >
      {seed ?? "—"}
    </Badge>
  );

  if (!isBye || seed === null) return badge;
  return <BadgeTooltip badge="bye">{badge}</BadgeTooltip>;
}
