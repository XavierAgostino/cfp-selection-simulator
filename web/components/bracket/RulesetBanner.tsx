"use client";

import type { Ruleset } from "@/lib/types";

interface RulesetBannerProps {
  ruleset: Ruleset;
}

const rulesetCopy: Record<
  Ruleset,
  { title: string; subtitle: string }
> = {
  "2025_plus": {
    title: "2025+ Straight Seeding",
    subtitle: "Top four overall seeds receive first-round byes.",
  },
  "2024": {
    title: "2024 Champion-Bye Format",
    subtitle: "Top four conference champions receive first-round byes.",
  },
};

/** Bracket-specific ruleset context shown above the full bracket canvas. */
export function RulesetBanner({ ruleset }: RulesetBannerProps) {
  const copy = rulesetCopy[ruleset];

  return (
    <div
      role="note"
      className="rounded-md border border-border bg-secondary/40 px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground">{copy.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{copy.subtitle}</p>
    </div>
  );
}
