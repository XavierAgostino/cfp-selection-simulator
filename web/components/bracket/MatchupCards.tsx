import { MatchupEdgeCard } from "@/components/bracket/MatchupEdgeCard";
import type { BracketPayload, TeamSlot } from "@/lib/types";

interface MatchupCardsProps {
  bracket: BracketPayload;
}

/**
 * Matchups tab: one Matchup Edge card per projected first-round game. A
 * component-profile comparison, not a game prediction — it compares the teams
 * on the same inputs the ranking model uses, never who would win on the field.
 */
export function MatchupCards({ bracket }: MatchupCardsProps) {
  const byeBySeed = new Map<number, TeamSlot>();
  for (const pod of bracket.pods) {
    if (pod.bye.seed !== null) byeBySeed.set(pod.bye.seed, pod.bye);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Matchup Edge</span> is a
        profile comparison for each projected first-round game: which team has
        the stronger Resume, Predictive, schedule, and overall composite
        profile on the same inputs the ranking model uses. It does not
        estimate who would win the game.
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {bracket.rounds.first_round.map((game) => (
          <MatchupEdgeCard
            key={game.game_id}
            game={game}
            byeTeam={byeBySeed.get(game.winner_to_seed) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
