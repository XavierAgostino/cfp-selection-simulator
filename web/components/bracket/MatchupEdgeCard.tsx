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

/** A composite share within this many points of 50/50 reads as close. */
const CLOSE_PROFILE_MARGIN = 2;

type EdgeMetricKey = "resume_score" | "predictive_score" | "sor" | "sos";

const EDGE_METRICS: {
  key: EdgeMetricKey;
  /** Short row label; the section header already says this is an edge. */
  label: string;
  explain: ExplainMetricKey;
}[] = [
  { key: "resume_score", label: "Resume", explain: "resume_edge" },
  { key: "predictive_score", label: "Predictive", explain: "predictive_edge" },
  { key: "sor", label: "SOR", explain: "sor_edge" },
  { key: "sos", label: "SOS", explain: "sos_edge" },
];

/** Muted fallbacks when a team has no brand color — neutral, never red/green. */
const FALLBACK_COLOR_A = "var(--accent-blue)";
const FALLBACK_COLOR_B = "var(--accent-gold)";

interface MatchupEdgeCardProps {
  game: FirstRoundGame;
  /** The bye team the winner advances to face, when resolvable from the pods. */
  byeTeam: TeamSlotData | null;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * One readable sentence per card: who has the composite edge and how the
 * component edges split. Profile-comparison language only — never who wins.
 */
function edgeSummary(
  teamA: TeamSlotData,
  teamB: TeamSlotData,
  aShare: number,
): { lead: string; detail: string } {
  const aLeads: string[] = [];
  const bLeads: string[] = [];
  for (const { key, label } of EDGE_METRICS) {
    const diff = teamA[key] - teamB[key];
    if (Math.abs(diff) < EVEN_THRESHOLD) continue;
    (diff > 0 ? aLeads : bLeads).push(label);
  }

  const leader = aShare >= 50 ? teamA : teamB;
  const close = Math.abs(aShare - 50) <= CLOSE_PROFILE_MARGIN;
  const lead = close
    ? "Close composite profile"
    : `Composite edge: ${leader.team}`;

  let detail: string;
  if (aLeads.length === 0 && bLeads.length === 0) {
    detail = "the component profiles are even across the board";
  } else if (bLeads.length === 0) {
    detail =
      aLeads.length === EDGE_METRICS.length
        ? `${teamA.team === leader.team && !close ? "leads" : `${teamA.team} leads`} all four model components`
        : `${teamA.team} leads ${joinList(aLeads)}`;
  } else if (aLeads.length === 0) {
    detail =
      bLeads.length === EDGE_METRICS.length
        ? `${teamB.team === leader.team && !close ? "leads" : `${teamB.team} leads`} all four model components`
        : `${teamB.team} leads ${joinList(bLeads)}`;
  } else {
    detail = `${teamA.team} leads ${joinList(aLeads)}; ${teamB.team} leads ${joinList(bLeads)}`;
  }
  return { lead, detail };
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
  const summary = edgeSummary(team_a, team_b, aShare);

  return (
    <Card className="gap-4 shadow-none">
      <div className="flex items-center justify-between gap-3 px-4">
        <TeamHeader team={team_a} />
        <span className="shrink-0 text-xs text-muted-foreground">VS</span>
        <TeamHeader team={team_b} align="right" />
      </div>

      <div className="flex flex-col gap-1.5 px-4">
        <MetricTooltip
          metric="composite_profile"
          focusable
          className="self-start text-[0.65rem] uppercase tracking-wide text-muted-foreground"
        />
        <div className="flex items-center gap-2.5 text-xs tabular-nums">
          <span className="shrink-0">
            <span className="text-muted-foreground">
              {team_a.abbreviation ?? team_a.team}
            </span>{" "}
            <span className="font-semibold text-foreground">{aPct}%</span>
          </span>
          <div className="flex h-1.5 flex-1 items-center gap-px overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-l-full"
              style={{
                width: `${aShare}%`,
                backgroundColor: team_a.primary_color ?? FALLBACK_COLOR_A,
                opacity: 0.65,
              }}
            />
            <div
              className="h-full flex-1 rounded-r-full"
              style={{
                backgroundColor: team_b.primary_color ?? FALLBACK_COLOR_B,
                opacity: 0.65,
              }}
            />
          </div>
          <span className="shrink-0">
            <span className="font-semibold text-foreground">{bPct}%</span>{" "}
            <span className="text-muted-foreground">
              {team_b.abbreviation ?? team_b.team}
            </span>
          </span>
        </div>
        <span className="text-[0.6rem] text-muted-foreground/70">
          Profile share, not a win probability
        </span>
      </div>

      <p className="px-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/90">{summary.lead}.</span>{" "}
        {summary.detail.charAt(0).toUpperCase()}
        {summary.detail.slice(1)}.
      </p>

      <div className="flex flex-col gap-1.5 px-4">
        <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">
          Component Edge
        </span>
        {EDGE_METRICS.map(({ key, label, explain }) => (
          <EdgeRow
            key={key}
            label={label}
            explain={explain}
            teamA={team_a}
            teamB={team_b}
            metricKey={key}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border px-4 pt-3 text-xs text-muted-foreground">
        <span>
          Campus site at{" "}
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
          "flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
        <div className="flex min-w-0 flex-col gap-0.5">
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
              {formatRecord(team.record)}
            </span>
            <BidBadge bidType={team.bid_type} className="px-1 py-0" />
          </div>
        </div>
      </button>
    </TeamHoverCard>
  );
}

function EdgeRow({
  label,
  explain,
  teamA,
  teamB,
  metricKey,
}: {
  label: string;
  explain: ExplainMetricKey;
  teamA: TeamSlotData;
  teamB: TeamSlotData;
  metricKey: EdgeMetricKey;
}) {
  const diff = teamA[metricKey] - teamB[metricKey];
  const isEven = Math.abs(diff) < EVEN_THRESHOLD;
  const leader = diff > 0 ? teamA : teamB;

  return (
    <div className="flex items-center gap-2.5">
      <MetricTooltip metric={explain} side="left">
        <span
          tabIndex={0}
          className="w-20 shrink-0 cursor-help text-[0.65rem] uppercase tracking-wide text-muted-foreground underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {label}
        </span>
      </MetricTooltip>
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
