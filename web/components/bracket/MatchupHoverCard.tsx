"use client";

import * as React from "react";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { ConferenceCaption } from "@/components/team/ConferenceBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import { formatRecord, formatScore } from "@/lib/format";
import type { ScoreMetricKey } from "@/lib/scoreBars";
import type { TeamHoverData } from "@/components/team/TeamHoverCard";
import { cn } from "@/lib/utils";

const COMPARE_METRICS: ScoreMetricKey[] = [
  "composite",
  "resume",
  "predictive",
  "sor",
  "sos",
];

const FALLBACK_BAR_COLOR = "#64748B";

interface MatchupHoverCardProps {
  teamA: TeamHoverData;
  teamB: TeamHoverData;
  /** Context line, e.g. "Winner meets the No. 4 seed". */
  note?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

function metricValue(team: TeamHoverData, metric: ScoreMetricKey): number {
  switch (metric) {
    case "composite":
      return team.composite_score;
    case "resume":
      return team.resume_score;
    case "predictive":
      return team.predictive_score;
    case "sor":
      return team.sor;
    case "sos":
      return team.sos;
  }
}

/**
 * Full matchup preview: both teams head-to-head across all five metrics,
 * with team-colored diverging bars and the stronger side of each row
 * emphasized. The bracket's answer to "what does this matchup mean?".
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
          {COMPARE_METRICS.map((metric) => (
            <CompareRow
              key={metric}
              label={METRIC_EXPLANATIONS[metric].label}
              a={metricValue(teamA, metric)}
              b={metricValue(teamB, metric)}
              colorA={teamA.primary_color}
              colorB={teamB.primary_color}
            />
          ))}
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
        <ConferenceCaption conference={team.conference} className="block text-[0.6rem]" />
      </div>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
  colorA,
  colorB,
}: {
  label: string;
  a: number;
  b: number;
  colorA: string | null;
  colorB: string | null;
}) {
  const aPct = Math.max(0, Math.min(100, a * 100));
  const bPct = Math.max(0, Math.min(100, b * 100));

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
      <div className="flex h-1 flex-1 justify-end overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-l-full"
          style={{ width: `${aPct}%`, backgroundColor: colorA ?? FALLBACK_BAR_COLOR }}
        />
      </div>
      <span className="w-14 shrink-0 text-center text-[0.6rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex h-1 flex-1 justify-start overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-r-full"
          style={{ width: `${bPct}%`, backgroundColor: colorB ?? FALLBACK_BAR_COLOR }}
        />
      </div>
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
