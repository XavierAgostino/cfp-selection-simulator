"use client";

import Link from "next/link";
import { ArrowRight, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { MatchupHoverCard } from "@/components/bracket/MatchupHoverCard";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { FirstRoundGame, TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

function MatchupSide({ team }: { team: TeamSlot }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(team.team)}
      aria-label={`Open resume for ${team.team}`}
      className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <SeedBadge seed={team.seed} isBye={team.is_bye} />
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={22}
      />
      <span className="truncate text-sm font-medium text-foreground">
        {team.abbreviation ?? team.team}
      </span>
    </button>
  );
}

interface FirstRoundMatchupsProps {
  games: FirstRoundGame[] | null;
}

/** Compact first-round matchup cards from bracket.json, or an EmptyState stub when the bracket hasn't been generated yet. */
export function FirstRoundMatchups({ games }: FirstRoundMatchupsProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="px-4">
        <CardTitle>First-Round Matchups</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {games ? (
          <>
            <div className="flex flex-col gap-2">
              {games.map((game) => (
                <MatchupHoverCard
                  key={game.game_id}
                  teamA={game.team_a}
                  teamB={game.team_b}
                  note={`Winner meets the No. ${game.winner_to_seed} seed in the quarterfinals`}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1 rounded-md border border-border bg-secondary/30 p-2",
                    )}
                  >
                    <div className="flex items-center">
                      <MatchupSide team={game.team_a} />
                      <span className="px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        vs
                      </span>
                      <MatchupSide team={game.team_b} />
                    </div>
                    <div className="px-2 text-[0.7rem] text-muted-foreground">
                      Winner meets #{game.winner_to_seed}
                    </div>
                  </div>
                </MatchupHoverCard>
              ))}
            </div>
            <Link
              href="/bracket"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              View full bracket
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <EmptyState
            icon={<Network className="h-5 w-5" />}
            title="Bracket not generated yet"
            description="First-round matchups will appear here once the bracket export runs."
          />
        )}
      </CardContent>
    </Card>
  );
}
