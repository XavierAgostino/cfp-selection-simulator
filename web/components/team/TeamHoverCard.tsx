"use client";

import * as React from "react";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatRecord, formatScore } from "@/lib/format";
import type { BidType, Record_ } from "@/lib/types";

/**
 * Normalized team shape for the hover preview. TeamSlot (bracket/field) and
 * RankingRow (rankings table) are both structurally assignable, so every
 * surface can pass its row straight through.
 *
 * Interaction hierarchy: this card is the quick preview (hover on desktop);
 * clicking the trigger should open the team resume drawer for deep
 * inspection, which is also the touch path. Content is laid out so a
 * side-by-side team comparison can reuse it later.
 */
export interface TeamHoverData {
  team: string;
  abbreviation: string | null;
  conference: string;
  logo_url: string | null;
  primary_color: string | null;
  bid_type: BidType | null;
  record: Record_;
  composite_score: number;
  resume_score: number;
  predictive_score: number;
  sor: number;
  sos: number;
  rank?: number;
  seed?: number | null;
  is_bye?: boolean;
}

interface TeamHoverCardProps {
  team: TeamHoverData;
  /** True when this team is the first team out of the field. */
  isFirstOut?: boolean;
  /** The trigger element (usually a button that opens the drawer on click). */
  children: React.ReactElement<Record<string, unknown>>;
}

/** Rich hover preview: identity row + full score breakdown. */
export function TeamHoverCard({ team, isFirstOut, children }: TeamHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={150} render={children} />
      <HoverCardContent className="w-72">
        <TeamHoverContent team={team} isFirstOut={isFirstOut} />
      </HoverCardContent>
    </HoverCard>
  );
}

/** Card body, separated so a future comparison view can render two side by side. */
export function TeamHoverContent({
  team,
  isFirstOut,
}: {
  team: TeamHoverData;
  isFirstOut?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <TeamLogoTile
          team={team.team}
          logoUrl={team.logo_url}
          abbreviation={team.abbreviation}
          primaryColor={team.primary_color}
          size={32}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {typeof team.rank === "number" ? (
                <span className="mr-1 text-muted-foreground">#{team.rank}</span>
              ) : null}
              {team.team}
            </span>
            {team.bid_type === "auto" ? (
              <ConferenceBadge conference={team.conference} isChampion size="md" />
            ) : null}
          </div>
          {team.bid_type !== "auto" ? (
            <ConferenceCaption conference={team.conference} />
          ) : null}
          <p className="text-xs text-muted-foreground">{formatRecord(team.record)}</p>
        </div>
        <BidBadge bidType={team.bid_type} isFirstOut={isFirstOut} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2.5">
        <ScoreStat label="Composite" value={team.composite_score} />
        <ScoreStat label="Resume" value={team.resume_score} />
        <ScoreStat label="Predictive" value={team.predictive_score} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ScoreStat label="SOR" value={team.sor} />
        <ScoreStat label="SOS" value={team.sos} />
      </div>
      <p className="mt-2.5 border-t border-border pt-2 text-[0.65rem] text-muted-foreground">
        Click for the full resume
      </p>
    </>
  );
}

function ScoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground">
        {formatScore(value)}
      </span>
    </div>
  );
}
