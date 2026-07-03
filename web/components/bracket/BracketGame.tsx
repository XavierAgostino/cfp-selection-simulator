"use client";

import { Card } from "@/components/ui/card";
import { TeamSlot } from "@/components/bracket/TeamSlot";
import { MatchupHoverCard } from "@/components/bracket/MatchupHoverCard";
import { firstRoundHost, podMeta } from "@/components/bracket/types";
import type { BracketPod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BracketGameProps {
  pod: BracketPod;
  className?: string;
}

/**
 * One pod, rendered as the hero unit of the Full Bracket view: pod identity
 * up top (letter + seed math), the bye team waiting in the quarterfinal,
 * then the first-round campus game feeding it. Hovering the campus footer
 * previews the full matchup comparison.
 */
export function BracketGame({ pod, className }: BracketGameProps) {
  const [teamA, teamB] = pod.first_round;
  const meta = podMeta(pod);
  const host = firstRoundHost(teamA, teamB);

  return (
    <Card
      size="sm"
      className={cn(
        "gap-0 overflow-hidden border border-border py-0 shadow-none transition-colors duration-150 hover:border-foreground/25",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">
          Pod {meta.letter}
        </span>
        <span className="text-[0.65rem] uppercase tracking-wide tabular-nums text-muted-foreground">
          {meta.formula}
        </span>
      </div>

      <TeamSlot team={pod.bye} variant="lg" showBid />
      <div className="flex items-center justify-between border-y border-dashed border-border px-3 py-1">
        <span className="text-[0.6rem] font-medium uppercase tracking-wide text-accent-gold/90">
          First-round bye
        </span>
        <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
          Quarterfinal · bowl site
        </span>
      </div>

      <TeamSlot team={teamA} variant="lg" showBid />
      <div className="px-2">
        <div className="h-px bg-border" />
      </div>
      <TeamSlot team={teamB} variant="lg" showBid />

      <MatchupHoverCard
        teamA={teamA}
        teamB={teamB}
        note={`Winner meets No. ${pod.bye.seed} ${pod.bye.team} in ${pod.quarterfinal_id}`}
      >
        <div
          tabIndex={0}
          aria-label={`Preview first-round matchup: ${teamA.team} vs ${teamB.team}, hosted by ${host.team}`}
          className="cursor-help border-t border-border bg-secondary/25 px-3 py-1.5 text-[0.65rem] text-muted-foreground outline-none transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="font-medium text-foreground/80">
            Winner meets No. {pod.bye.seed} {pod.bye.team}
          </span>
          <span className="mx-1.5 text-border">·</span>
          at {host.team}
        </div>
      </MatchupHoverCard>
    </Card>
  );
}
