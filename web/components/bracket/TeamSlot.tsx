"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatRecord } from "@/lib/format";
import type { TeamSlot as TeamSlotData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TeamSlotProps {
  team: TeamSlotData;
  /** "row" is the standard bracket-card row; "compact" trims padding for dense matchup lists. */
  variant?: "row" | "compact";
  className?: string;
}

/**
 * A single team's line inside a bracket game: seed, logo, name, conference,
 * and a bid-type accent. Hovering surfaces the shared TeamHoverCard preview;
 * clicking (or tapping) opens the team resume drawer.
 */
export function TeamSlot({ team, variant = "row", className }: TeamSlotProps) {
  const { openTeam } = useTeamDrawer();
  const compact = variant === "compact";

  return (
    <TeamHoverCard team={team}>
      <button
        type="button"
        onClick={() => openTeam(team.team)}
        aria-label={`Open resume for ${team.team}`}
        className={cn(
          "group/slot flex w-full items-center gap-2.5 rounded-md border-l-2 px-2 text-left transition-colors duration-150",
          compact ? "py-1.5" : "py-2",
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
          size={compact ? 20 : 26}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate font-medium text-foreground",
                compact ? "text-xs" : "text-sm",
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
        <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
          {formatRecord(team.record)}
        </span>
      </button>
    </TeamHoverCard>
  );
}
