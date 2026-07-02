import { Badge } from "@/components/ui/badge";
import { seedChipVariant } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SeedBadgeProps {
  seed: number | null;
  isBye?: boolean;
  className?: string;
}

/** Seed number chip; gold treatment when the team holds a first-round bye (seeds 1-4). */
export function SeedBadge({ seed, isBye = false, className }: SeedBadgeProps) {
  return (
    <Badge
      variant={seedChipVariant(seed, isBye)}
      title={isBye && seed !== null ? "First-round bye — top four seed" : undefined}
      className={cn(
        "h-6 w-6 justify-center rounded-md p-0 text-xs font-semibold tabular-nums",
        seed === null && "text-muted-foreground",
        className,
      )}
    >
      {seed ?? "—"}
    </Badge>
  );
}
