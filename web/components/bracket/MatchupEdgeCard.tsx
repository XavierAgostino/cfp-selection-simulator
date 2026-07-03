"use client";

import { Card } from "@/components/ui/card";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { MetricTooltip } from "@/components/explain/InfoTooltip";
import { firstRoundHost } from "@/components/bracket/types";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { ExplainMetricKey } from "@/lib/explain";
import { formatRecord } from "@/lib/format";
import type { FirstRoundGame, TeamSlot as TeamSlotData } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Differences smaller than this read as noise, not an edge. */
const EVEN_THRESHOLD = 0.005;

const EDGE_METRICS: {
  key: "resume_score" | "predictive_score" | "sor" | "sos";
  explain: ExplainMetricKey;
}[] = [
  { key: "resume_score", explain: "resume_edge" },
  { key: "predictive_score", explain: "predictive_edge" },
  { key: "sor", explain: "sor_edge" },
  { key: "sos", explain: "sos_edge" },
];

interface MatchupEdgeCardProps {
  game: FirstRoundGame;
  /** The bye team the winner advances to face, when resolvable from the pods. */
  byeTeam: TeamSlotData | null;
}

/**
 * Head-to-head profile comparison for a projected first-round game. This is
 * NOT a game prediction: it compares the two teams on the same inputs the
 * ranking model uses (composite, Resume, Predictive, SOR, SOS) so you can see
 * which profile is stronger — never who would win on the field.
 */
export function MatchupEdgeCard({ game, byeTeam }: MatchupEdgeCardProps) {
  const { team_a, team_b } = game;
  const host = firstRoundHost(team_a, team_b);

  const total = team_a.composite_score + team_b.composite_score;
  const aShare = total > 0 ? (team_a.composite_score / total) * 100 : 50;
  const aPct = Math.round(aShare);
  const bPct = 100 - aPct;

  return (
    <Card className="gap-4 shadow-none">
      <div className="flex items-center justify-between px-4">
        <TeamHeader team={team_a} />
        <span className="px-2 text-xs text-muted-foreground">VS</span>
        <TeamHeader team={team_b} align="right" />
      </div>

      <div className="flex flex-col gap-1.5 px-4">
        <div className="flex items-baseline justify-between">
          <MetricTooltip
            metric="composite_profile"
            focusable
            className="text-[0.65rem] uppercase tracking-wide text-muted-foreground"
          />
          <span className="text-[0.6rem] text-muted-foreground/70">
            Not a game win probability
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-foreground">
            {aPct}%
          </span>
          <div className="flex h-2 flex-1 items-center gap-px overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-l-full"
              style={{
                width: `${aShare}%`,
                backgroundColor: team_a.primary_color ?? "#64748B",
              }}
            />
            <div
              className="h-full flex-1 rounded-r-full"
              style={{ backgroundColor: team_b.primary_color ?? "#64748B" }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
            {bPct}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-4">
        {EDGE_METRICS.map(({ key, explain }) => (
          <EdgeRow
            key={key}
            explain={explain}
            teamA={team_a}
            teamB={team_b}
            metricKey={key}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border px-4 pt-3 text-xs text-muted-foreground">
        <span>
          Campus site — at{" "}
          <span className="font-medium text-foreground/80">{host.team}</span>
        </span>
        <span>
          Winner faces{" "}
          <span className="font-medium text-foreground/80">
            {byeTeam
              ? `No. ${game.winner_to_seed} ${byeTeam.team}`
              : `the No. ${game.winner_to_seed} seed`}
          </span>
        </span>
      </div>
    </Card>
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
          <div
            className={cn(
              "flex items-center gap-1.5",
              align === "right" && "flex-row-reverse",
            )}
          >
            <span className="truncate text-[0.7rem] tabular-nums text-muted-foreground">
              {formatRecord(team.record)} · {team.conference}
            </span>
            <BidBadge bidType={team.bid_type} className="px-1 py-0" />
          </div>
        </div>
      </button>
    </TeamHoverCard>
  );
}

function EdgeRow({
  explain,
  teamA,
  teamB,
  metricKey,
}: {
  explain: ExplainMetricKey;
  teamA: TeamSlotData;
  teamB: TeamSlotData;
  metricKey: "resume_score" | "predictive_score" | "sor" | "sos";
}) {
  const diff = teamA[metricKey] - teamB[metricKey];
  const isEven = Math.abs(diff) < EVEN_THRESHOLD;
  const leader = diff > 0 ? teamA : teamB;

  return (
    <div className="flex items-center gap-2.5">
      <MetricTooltip
        metric={explain}
        focusable
        className="w-28 shrink-0 text-[0.65rem] uppercase tracking-wide text-muted-foreground"
      />
      {isEven ? (
        <span className="text-xs text-muted-foreground">Even</span>
      ) : (
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
          <TeamLogoTile
            team={leader.team}
            logoUrl={leader.logo_url}
            abbreviation={leader.abbreviation}
            primaryColor={leader.primary_color}
            size={16}
          />
          <span className="truncate">
            {leader.team}{" "}
            <span className="font-medium tabular-nums">
              +{Math.abs(diff).toFixed(3)}
            </span>
          </span>
        </span>
      )}
    </div>
  );
}
