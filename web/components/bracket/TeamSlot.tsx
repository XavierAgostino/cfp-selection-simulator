"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { BidBadge } from "@/components/team/BidBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatRecord, formatScore } from "@/lib/format";
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
 * and a bid-type accent. Hovering surfaces the composite/resume/predictive
 * breakdown; clicking opens the shared team resume drawer.
 */
export function TeamSlot({ team, variant = "row", className }: TeamSlotProps) {
  const { openTeam } = useTeamDrawer();
  const compact = variant === "compact";

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        render={
          <button
            type="button"
            onClick={() => openTeam(team.team)}
            className={cn(
              "group/slot flex w-full items-center gap-2.5 rounded-md border-l-2 px-2 text-left transition-colors duration-150",
              compact ? "py-1.5" : "py-2",
              team.is_bye
                ? "border-l-accent-gold bg-accent-gold/[0.06]"
                : team.bid_type === "auto"
                  ? "border-l-primary/60"
                  : "border-l-border",
              "hover:bg-secondary/70",
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
        }
      />
      <HoverCardContent className="w-72">
        <div className="flex items-center gap-2.5">
          <TeamLogoTile
            team={team.team}
            logoUrl={team.logo_url}
            abbreviation={team.abbreviation}
            primaryColor={team.primary_color}
            size={32}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {team.team}
              </span>
              {team.bid_type === "auto" ? (
                <ConferenceBadge
                  conference={team.conference}
                  isChampion
                  size="md"
                />
              ) : null}
            </div>
            {team.bid_type !== "auto" ? (
              <ConferenceCaption conference={team.conference} />
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatRecord(team.record)}
            </p>
          </div>
          <BidBadge bidType={team.bid_type} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2.5">
          <ScoreStat label="Composite" value={team.composite_score} />
          <ScoreStat label="Resume" value={team.resume_score} />
          <ScoreStat label="Predictive" value={team.predictive_score} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ScoreStat label="SOR" value={team.sor} />
          <ScoreStat label="SOS" value={team.sos} />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function ScoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground">
        {formatScore(value)}
      </span>
    </div>
  );
}
