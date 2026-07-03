"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { TeamSlot } from "@/components/bracket/TeamSlot";
import { MatchupHoverCard } from "@/components/bracket/MatchupHoverCard";
import { firstRoundHost } from "@/components/bracket/types";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { BracketPayload, TeamSlot as TeamSlotData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BracketSummariesProps {
  bracket: BracketPayload;
}

/**
 * The two questions a CFP bracket must answer at a glance, spelled out below
 * the bracket: who hosts the first-round campus games, and who skips
 * straight to the quarterfinal bowl games on a bye.
 */
export function BracketSummaries({ bracket }: BracketSummariesProps) {
  const byes = [...bracket.pods]
    .sort((a, b) => (a.bye.seed ?? 99) - (b.bye.seed ?? 99))
    .map((pod) => pod.bye);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="gap-3 border-border bg-card shadow-none">
        <CardHeader className="px-4">
          <CardTitle>Campus Sites — First Round</CardTitle>
          <p className="text-xs text-muted-foreground">
            Seeds 5–8 host on campus. Hover a game for the head-to-head.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
          {bracket.rounds.first_round.map((game) => (
            <CampusGameRow
              key={game.game_id}
              teamA={game.team_a}
              teamB={game.team_b}
              winnerToSeed={game.winner_to_seed}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="gap-3 border-border bg-card shadow-none">
        <CardHeader className="px-4">
          <CardTitle>First-Round Byes — Quarterfinals</CardTitle>
          <p className="text-xs text-muted-foreground">
            The top four seeds wait at the bowl-site quarterfinals.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-4">
          {byes.map((team) => (
            <TeamSlot key={team.team} team={team} variant="lg" showBid />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CampusGameRow({
  teamA,
  teamB,
  winnerToSeed,
}: {
  teamA: TeamSlotData;
  teamB: TeamSlotData;
  winnerToSeed: number;
}) {
  const host = firstRoundHost(teamA, teamB);
  const visitor = host === teamA ? teamB : teamA;

  return (
    <MatchupHoverCard
      teamA={teamA}
      teamB={teamB}
      note={`Winner meets the No. ${winnerToSeed} seed in the quarterfinals`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-secondary/30 px-2 py-1.5">
        <SummaryTeamChip team={visitor} />
        <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          at
        </span>
        <SummaryTeamChip team={host} emphasized />
        <span className="ml-auto text-[0.65rem] tabular-nums text-muted-foreground">
          → No. {winnerToSeed}
        </span>
      </div>
    </MatchupHoverCard>
  );
}

function SummaryTeamChip({
  team,
  emphasized = false,
}: {
  team: TeamSlotData;
  emphasized?: boolean;
}) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(team.team)}
      aria-label={`Open resume for ${team.team}`}
      className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <SeedBadge seed={team.seed} isBye={team.is_bye} />
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={20}
      />
      <span
        className={cn(
          "truncate text-xs text-foreground",
          emphasized ? "font-semibold" : "font-medium",
        )}
      >
        {team.abbreviation ?? team.team}
      </span>
    </button>
  );
}
