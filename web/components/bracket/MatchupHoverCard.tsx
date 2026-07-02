"use client";

import * as React from "react";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatRecord, formatScore } from "@/lib/format";
import type { TeamHoverData } from "@/components/team/TeamHoverCard";
import { cn } from "@/lib/utils";

interface MatchupHoverCardProps {
  teamA: TeamHoverData;
  teamB: TeamHoverData;
  /** Context line, e.g. "Winner meets the No. 4 seed". */
  note?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Quick matchup preview: both teams head-to-head across the three headline
 * metrics, with the stronger side of each row emphasized. Basic version —
 * the bracket flagship pass (Phase 1B) extends it.
 */
export function MatchupHoverCard({ teamA, teamB, note, children }: MatchupHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={200} render={children} />
      <HoverCardContent className="w-80">
        <div className="flex items-center justify-between gap-2">
          <MatchupTeam team={teamA} />
          <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            vs
          </span>
          <MatchupTeam team={teamB} align="right" />
        </div>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-2.5">
          <CompareRow label="Composite" a={teamA.composite_score} b={teamB.composite_score} />
          <CompareRow label="Resume" a={teamA.resume_score} b={teamB.resume_score} />
          <CompareRow label="Predictive" a={teamA.predictive_score} b={teamB.predictive_score} />
        </div>
        {note ? (
          <p className="mt-2.5 border-t border-border pt-2 text-[0.65rem] text-muted-foreground">
            {note}
          </p>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

function MatchupTeam({
  team,
  align = "left",
}: {
  team: TeamHoverData;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={28}
      />
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-foreground">
          {typeof team.seed === "number" ? (
            <span className="mr-1 text-muted-foreground">{team.seed}</span>
          ) : null}
          {team.abbreviation ?? team.team}
        </div>
        <div className="truncate text-[0.65rem] tabular-nums text-muted-foreground">
          {formatRecord(team.record)}
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span
        className={cn(
          "w-10 shrink-0 tabular-nums",
          a >= b ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {formatScore(a)}
      </span>
      <span className="flex-1 text-center text-[0.6rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "w-10 shrink-0 text-right tabular-nums",
          b >= a ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {formatScore(b)}
      </span>
    </div>
  );
}
