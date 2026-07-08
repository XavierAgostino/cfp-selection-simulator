"use client";

import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/explain/InfoTooltip";

/**
 * Warning/status pills for the Committee Tendencies cards. Explainer copy
 * comes from the artifact's `badge_explainers` map (never authored here), so
 * a badge without an explainer renders as a plain pill with no tooltip.
 *
 * Uses a real Tooltip rather than the native `title` attribute, which the
 * browser positions and styles itself (and would overflow off small pills).
 */
export function WarningBadges({
  badges,
  explainers,
}: {
  badges: string[];
  explainers: Record<string, string>;
}) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const explainer = explainers[badge];
        const pill = (
          <Badge variant="secondary" className={explainer ? "cursor-help" : undefined}>
            {badge}
          </Badge>
        );
        return explainer ? (
          <InfoTooltip key={badge} content={explainer}>
            {pill}
          </InfoTooltip>
        ) : (
          <span key={badge}>{pill}</span>
        );
      })}
    </div>
  );
}
