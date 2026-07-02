"use client";

import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/explain/InfoTooltip";
import type { Ruleset } from "@/lib/types";

interface RulesetBadgeProps {
  ruleset: Ruleset;
  className?: string;
}

const rulesetCopy: Record<Ruleset, { label: string; description: string }> = {
  "2025_plus": {
    label: "2025+ Straight Seeding",
    description:
      "The top 12 teams by rank are seeded 1-12 in order. The four highest-ranked conference champions receive automatic bids; the top four overall seeds earn byes.",
  },
  "2024": {
    label: "2024 Champion Byes",
    description:
      "The five highest-ranked conference champions are automatically seeded into the top four slots (with byes), even if that means jumping ahead of higher-ranked at-large teams.",
  },
};

/** Ruleset label chip with the full seeding explanation on hover/focus. */
export function RulesetBadge({ ruleset, className }: RulesetBadgeProps) {
  const copy = rulesetCopy[ruleset];

  return (
    <InfoTooltip title={copy.label} content={copy.description}>
      <Badge
        variant="chip-neutral"
        tabIndex={0}
        className={`cursor-default ${className ?? ""}`}
      >
        {copy.label}
      </Badge>
    </InfoTooltip>
  );
}
