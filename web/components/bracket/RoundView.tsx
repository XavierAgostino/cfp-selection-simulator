"use client";

import { Card } from "@/components/ui/card";
import { TeamSlot } from "@/components/bracket/TeamSlot";
import { BracketRound } from "@/components/bracket/BracketRound";
import { MatchupHoverCard } from "@/components/bracket/MatchupHoverCard";
import { firstRoundHost, podMeta } from "@/components/bracket/types";
import type { BracketPayload } from "@/lib/types";

interface RoundViewProps {
  bracket: BracketPayload;
}

/** A pending (not-yet-determined) game row — used for QF/SF/championship slots. */
function PendingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[0.65rem]">
        ?
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

/** Small pod identity chip for QF cards, e.g. "Pod A · 8/9 → 1". */
function PodChip({ letter, formula }: { letter: string; formula: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-1">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-foreground">
        Pod {letter}
      </span>
      <span className="text-[0.6rem] uppercase tracking-wide tabular-nums text-muted-foreground">
        {formula}
      </span>
    </div>
  );
}

/** Round-by-round breakdown with CFP site labels: campus first round → bowl quarterfinals → semifinals → championship. */
export function RoundView({ bracket }: RoundViewProps) {
  const { rounds, pods } = bracket;

  return (
    <div className="flex flex-col gap-8">
      <BracketRound
        title="First Round"
        subtitle={`${rounds.first_round.length} games · campus sites — higher seed hosts`}
      >
        {rounds.first_round.map((game) => {
          const host = firstRoundHost(game.team_a, game.team_b);
          return (
            <Card key={game.game_id} size="sm" className="gap-0 overflow-hidden py-0 shadow-none">
              <TeamSlot team={game.team_a} showBid />
              <div className="px-2">
                <div className="h-px bg-border" />
              </div>
              <TeamSlot team={game.team_b} showBid />
              <MatchupHoverCard
                teamA={game.team_a}
                teamB={game.team_b}
                note={`Winner meets the No. ${game.winner_to_seed} seed in the quarterfinals`}
              >
                <div
                  tabIndex={0}
                  aria-label={`Preview matchup: ${game.team_a.team} vs ${game.team_b.team}, hosted by ${host.team}`}
                  className="cursor-help border-t border-dashed border-border px-4 py-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground outline-none transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  at {host.team} · winner meets No. {game.winner_to_seed}
                </div>
              </MatchupHoverCard>
            </Card>
          );
        })}
      </BracketRound>

      <BracketRound
        title="Quarterfinals"
        subtitle={`${rounds.quarterfinals.length} games · bowl sites`}
      >
        {rounds.quarterfinals.map((game) => {
          const feeder = rounds.first_round.find(
            (fr) => fr.game_id === game.feeds_from,
          );
          const pod = pods.find((p) => p.quarterfinal_id === game.game_id);
          const meta = pod ? podMeta(pod) : null;
          return (
            <Card key={game.game_id} size="sm" className="gap-0 overflow-hidden py-0 shadow-none">
              {meta ? <PodChip letter={meta.letter} formula={meta.formula} /> : null}
              <TeamSlot team={game.bye_team} showBid />
              <PendingRow
                label={
                  feeder
                    ? `Winner: ${feeder.team_a.team} vs ${feeder.team_b.team}`
                    : `Winner of ${game.feeds_from}`
                }
              />
            </Card>
          );
        })}
      </BracketRound>

      <BracketRound title="Semifinals" subtitle="2 games · bowl sites">
        {rounds.semifinals.map((sf) => (
          <Card key={sf.side} size="sm" className="gap-0 py-0 shadow-none">
            {sf.pods.map((quarterfinalId) => {
              const pod = pods.find((p) => p.quarterfinal_id === quarterfinalId);
              return (
                <PendingRow
                  key={quarterfinalId}
                  label={
                    pod
                      ? `Winner: Pod ${podMeta(pod).letter} — No. ${pod.bye.seed} ${pod.bye.team} pod (${quarterfinalId})`
                      : `Winner of ${quarterfinalId}`
                  }
                />
              );
            })}
          </Card>
        ))}
      </BracketRound>

      <BracketRound title="Championship" subtitle={rounds.championship.label}>
        <Card size="sm" className="gap-0 py-0 shadow-none">
          <PendingRow label="Winner: Top semifinal" />
          <PendingRow label="Winner: Bottom semifinal" />
        </Card>
      </BracketRound>
    </div>
  );
}
