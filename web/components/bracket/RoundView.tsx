import { Card } from "@/components/ui/card";
import { TeamSlot } from "@/components/bracket/TeamSlot";
import { BracketRound } from "@/components/bracket/BracketRound";
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

/** Horizontal, round-by-round breakdown: First Round → Quarterfinals → Semifinals → Championship. */
export function RoundView({ bracket }: RoundViewProps) {
  const { rounds, pods } = bracket;

  return (
    <div className="flex flex-col gap-8">
      <BracketRound title="First Round" subtitle={`${rounds.first_round.length} games`}>
        {rounds.first_round.map((game) => (
          <Card key={game.game_id} size="sm" className="gap-0 py-0 shadow-none">
            <TeamSlot team={game.team_a} />
            <div className="px-2">
              <div className="h-px bg-border" />
            </div>
            <TeamSlot team={game.team_b} />
            <div className="border-t border-dashed border-border px-4 py-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              Winner meets No. {game.winner_to_seed}
            </div>
          </Card>
        ))}
      </BracketRound>

      <BracketRound
        title="Quarterfinals"
        subtitle={`${rounds.quarterfinals.length} games`}
      >
        {rounds.quarterfinals.map((game) => {
          const feeder = rounds.first_round.find(
            (fr) => fr.game_id === game.feeds_from,
          );
          return (
            <Card key={game.game_id} size="sm" className="gap-0 py-0 shadow-none">
              <TeamSlot team={game.bye_team} />
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

      <BracketRound title="Semifinals" subtitle="2 games">
        {rounds.semifinals.map((sf) => (
          <Card key={sf.side} size="sm" className="gap-0 py-0 shadow-none">
            {sf.pods.map((quarterfinalId) => {
              const pod = pods.find((p) => p.quarterfinal_id === quarterfinalId);
              return (
                <PendingRow
                  key={quarterfinalId}
                  label={
                    pod
                      ? `Winner: No. ${pod.bye.seed} pod (${quarterfinalId})`
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
