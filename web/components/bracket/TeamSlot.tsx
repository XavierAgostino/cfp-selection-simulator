"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { BidBadge } from "@/components/team/BidBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatRecord } from "@/lib/format";
import type { TeamSlot as TeamSlotData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TeamSlotProps {
  team: TeamSlotData;
  /**
   * "lg" is the flagship bracket row (bigger logo, bid badge);
   * "row" is the standard size; "compact" trims padding for dense lists.
   */
  variant?: "lg" | "row" | "compact";
  /** Show the AUTO / AT-LARGE chip after the record. */
  showBid?: boolean;
  className?: string;
}

/**
 * A single team's line inside a bracket game: seed, logo, name, conference,
 * record, and bid status. Hovering surfaces the shared TeamHoverCard preview;
 * clicking (or tapping) opens the team resume drawer.
 */
export function TeamSlot({
  team,
  variant = "row",
  showBid = false,
  className,
}: TeamSlotProps) {
  const { openTeam } = useTeamDrawer();
  const compact = variant === "compact";
  const lg = variant === "lg";

  return (
    <TeamHoverCard team={team}>
      <button
        type="button"
        onClick={() => openTeam(team.team)}
        aria-label={`Open resume for ${team.team}`}
        className={cn(
          "group/slot flex w-full items-center rounded-md border-l-2 text-left transition-colors duration-150",
          compact ? "gap-2.5 px-2 py-1.5" : lg ? "gap-3 px-3 py-2.5" : "gap-2.5 px-2 py-2",
          team.is_bye
            ? "border-l-accent-gold bg-accent-gold/[0.06]"
            : team.bid_type === "auto"
              ? "border-l-primary/60"
              : "border-l-border",
          "hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
      >
        <SeedBadge seed={team.seed} isBye={team.is_bye} className="shrink-0" />
        <TeamLogoTile
          team={team.team}
          logoUrl={team.logo_url}
          abbreviation={team.abbreviation}
          primaryColor={team.primary_color}
          size={compact ? 20 : lg ? 30 : 26}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate font-medium text-foreground",
                compact ? "text-xs" : lg ? "text-sm font-semibold" : "text-sm",
              )}
            >
              {team.team}
            </span>
            {team.bid_type === "auto" ? (
              <ConferenceBadge
                conference={team.conference}
                isChampion
                size={compact ? "sm" : "md"}
              />
            ) : null}
          </div>
          {team.bid_type !== "auto" ? (
            <ConferenceCaption
              conference={team.conference}
              className={compact ? "text-[0.65rem]" : undefined}
            />
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 tabular-nums text-muted-foreground",
            lg ? "text-xs" : "text-[0.7rem]",
          )}
        >
          {formatRecord(team.record)}
        </span>
        {showBid ? (
          <BidBadge bidType={team.bid_type} className="shrink-0 px-1.5 text-[0.6rem]" />
        ) : null}
      </button>
    </TeamHoverCard>
  );
}
