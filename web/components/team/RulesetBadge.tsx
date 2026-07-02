import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Ruleset } from "@/lib/types";

interface RulesetBadgeProps {
  ruleset: Ruleset;
  className?: string;
}

const rulesetCopy: Record<Ruleset, { label: string; description: string }> = {
  "2025_plus": {
    label: "2025+ Straight Seeding",
    description:
      "The top 12 teams by rank are seeded 1-12 in order, regardless of conference championship status. Only the four highest-ranked conference champions receive automatic bids; the top four overall seeds earn byes.",
  },
  "2024": {
    label: "2024 Champion Byes",
    description:
      "The five highest-ranked conference champions are automatically seeded into the top four slots (with byes), even if that means jumping ahead of higher-ranked at-large teams.",
  },
};

/** "2025+ Straight Seeding" / "2024 Champion Byes" — with a tooltip explaining the seeding rule. */
export function RulesetBadge({ ruleset, className }: RulesetBadgeProps) {
  const copy = rulesetCopy[ruleset];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            className={`cursor-default border-border bg-secondary text-foreground ${className ?? ""}`}
          >
            {copy.label}
          </Badge>
        }
      />
      <TooltipContent>{copy.description}</TooltipContent>
    </Tooltip>
  );
}
