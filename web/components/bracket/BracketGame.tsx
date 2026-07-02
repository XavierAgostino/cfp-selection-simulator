import { Card } from "@/components/ui/card";
import { TeamSlot } from "@/components/bracket/TeamSlot";
import type { BracketPod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BracketGameProps {
  pod: BracketPod;
  className?: string;
}

/**
 * One pod, rendered as the hero unit of the Full Bracket view: the bye seed
 * up top, the first-round matchup below it, and a "winner meets #N" hint
 * connecting the two — the whole quarterfinal slot in a single card.
 */
export function BracketGame({ pod, className }: BracketGameProps) {
  const [teamA, teamB] = pod.first_round;

  return (
    <Card
      size="sm"
      className={cn(
        "gap-0 border border-border py-0 shadow-none transition-colors duration-150 hover:border-foreground/20",
        className,
      )}
    >
      <TeamSlot team={pod.bye} />
      <div className="flex items-center gap-2 border-y border-dashed border-border px-4 py-1">
        <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          winner meets No. {pod.bye.seed}
        </span>
      </div>
      <TeamSlot team={teamA} />
      <div className="px-2">
        <div className="h-px bg-border" />
      </div>
      <TeamSlot team={teamB} />
    </Card>
  );
}
