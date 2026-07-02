"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { BidBadge } from "@/components/team/BidBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { formatScore } from "@/lib/format";
import type { TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TeamRowProps {
  team: TeamSlot;
  onClick?: () => void;
  className?: string;
}

/**
 * Logo + seed + name + conference + bid badge + composite score. Clickable
 * rows open the resume drawer (also the tap path on touch) and preview the
 * full score breakdown on hover.
 */
export function TeamRow({ team, onClick, className }: TeamRowProps) {
  const Comp = onClick ? "button" : "div";

  const row = (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={onClick ? `Open resume for ${team.team}` : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors duration-150",
        onClick &&
          "cursor-pointer hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <SeedBadge seed={team.seed} isBye={team.is_bye} />
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {team.team}
          </span>
          {team.bid_type === "auto" ? (
            <ConferenceBadge
              conference={team.conference}
              isChampion
              size="sm"
            />
          ) : null}
        </div>
        {team.bid_type !== "auto" ? (
          <ConferenceCaption conference={team.conference} />
        ) : null}
      </div>
      <BidBadge bidType={team.bid_type} />
      <span className="w-16 shrink-0 text-right text-sm tabular-nums text-foreground">
        {formatScore(team.composite_score)}
      </span>
    </Comp>
  );

  if (!onClick) return row;
  return <TeamHoverCard team={team}>{row}</TeamHoverCard>;
}
