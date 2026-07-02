"use client";

import { Card } from "@/components/ui/card";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { MetricTooltip } from "@/components/explain/InfoTooltip";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { ScoreMetricKey } from "@/lib/scoreBars";
import { formatRecord, formatScore } from "@/lib/format";
import type { BracketPayload, TeamSlot as TeamSlotData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MatchupCardsProps {
  bracket: BracketPayload;
}

/** First-round matchups as rich, side-by-side comparison cards. */
export function MatchupCards({ bracket }: MatchupCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {bracket.rounds.first_round.map((game) => (
        <Card key={game.game_id} className="gap-4 shadow-none">
          <div className="flex items-center justify-between px-4">
            <TeamHeader team={game.team_a} />
            <span className="px-2 text-xs text-muted-foreground">
              VS
            </span>
            <TeamHeader team={game.team_b} align="right" />
          </div>
          <div className="flex flex-col gap-2.5 px-4">
            <CompareBar
              metric="composite"
              a={game.team_a.composite_score}
              b={game.team_b.composite_score}
              colorA={game.team_a.primary_color}
              colorB={game.team_b.primary_color}
            />
            <CompareBar
              metric="resume"
              a={game.team_a.resume_score}
              b={game.team_b.resume_score}
              colorA={game.team_a.primary_color}
              colorB={game.team_b.primary_color}
            />
            <CompareBar
              metric="predictive"
              a={game.team_a.predictive_score}
              b={game.team_b.predictive_score}
              colorA={game.team_a.primary_color}
              colorB={game.team_b.primary_color}
            />
          </div>
          <div className="border-t border-border px-4 pt-3 text-xs text-muted-foreground">
            Winner advances to face No. {game.winner_to_seed} seed
          </div>
        </Card>
      ))}
    </div>
  );
}

function TeamHeader({
  team,
  align = "left",
}: {
  team: TeamSlotData;
  align?: "left" | "right";
}) {
  const { openTeam } = useTeamDrawer();
  return (
    <TeamHoverCard team={team}>
      <button
        type="button"
        onClick={() => openTeam(team.team)}
        aria-label={`Open resume for ${team.team}`}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          align === "right" && "flex-row-reverse text-right",
        )}
      >
        <SeedBadge seed={team.seed} isBye={team.is_bye} />
        <TeamLogoTile
          team={team.team}
          logoUrl={team.logo_url}
          abbreviation={team.abbreviation}
          primaryColor={team.primary_color}
          size={30}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {team.team}
          </div>
          <div className="truncate text-[0.7rem] tabular-nums text-muted-foreground">
            {formatRecord(team.record)}
          </div>
        </div>
      </button>
    </TeamHoverCard>
  );
}

function CompareBar({
  metric,
  a,
  b,
  colorA,
  colorB,
}: {
  metric: ScoreMetricKey;
  a: number;
  b: number;
  colorA: string | null;
  colorB: string | null;
}) {
  const aPct = Math.max(0, Math.min(100, a * 100));
  const bPct = Math.max(0, Math.min(100, b * 100));

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
        {formatScore(a)}
      </span>
      <div className="flex h-1.5 flex-1 items-center gap-px overflow-hidden rounded-full bg-secondary">
        <div className="flex h-full flex-1 justify-end">
          <div
            className="h-full rounded-l-full"
            style={{ width: `${aPct}%`, backgroundColor: colorA ?? "#64748B" }}
          />
        </div>
        <div className="flex h-full flex-1 justify-start">
          <div
            className="h-full rounded-r-full"
            style={{ width: `${bPct}%`, backgroundColor: colorB ?? "#64748B" }}
          />
        </div>
      </div>
      <span className="w-9 shrink-0 text-right text-[0.65rem] tabular-nums text-muted-foreground">
        {formatScore(b)}
      </span>
      <span className="w-16 shrink-0 text-right text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        <MetricTooltip metric={metric} />
      </span>
    </div>
  );
}
