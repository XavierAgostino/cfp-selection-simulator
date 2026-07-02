"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatScore } from "@/lib/format";
import type { TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BubbleAccent = "blue" | "red" | "muted";

const accentStyles: Record<BubbleAccent, { title: string; border: string; dot: string }> = {
  blue: {
    title: "text-foreground",
    border: "border-border",
    dot: "bg-foreground/70",
  },
  red: {
    title: "text-tag-red-text",
    border: "border-tag-red-border",
    dot: "bg-tag-red-dot",
  },
  muted: {
    title: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
};

interface BubbleColumnProps {
  title: string;
  description: string;
  accent: BubbleAccent;
  teams: TeamSlot[];
  cutLineScore: number;
  isInField?: boolean;
  isFirstOut?: boolean;
}

/** One column of the bubble board: rank, team, bid status, composite score, and delta to the cut line. */
export function BubbleColumn({
  title,
  description,
  accent,
  teams,
  cutLineScore,
  isInField = false,
  isFirstOut = false,
}: BubbleColumnProps) {
  const { openTeam } = useTeamDrawer();
  const style = accentStyles[accent];

  return (
    <Card className={cn("border bg-card", style.border)}>
      <CardHeader className="px-4">
        <CardTitle className={cn("flex items-center gap-2 text-sm uppercase tracking-wide", style.title)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
          {title}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4">
        {teams.map((team) => {
          const delta = team.composite_score - cutLineScore;
          const deltaLabel = `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`;
          const deltaColor =
            delta > 0
              ? "text-foreground"
              : delta < 0
                ? "text-tag-red-text"
                : "text-muted-foreground";

          return (
            <button
              key={team.team}
              type="button"
              onClick={() => openTeam(team.team)}
              className="flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors duration-150 hover:border-border hover:bg-secondary/40"
            >
              <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {team.rank}
              </span>
              <TeamLogoTile
                team={team.team}
                logoUrl={team.logo_url}
                abbreviation={team.abbreviation}
                primaryColor={team.primary_color}
                size={26}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {team.team}
                  </span>
                  {isInField && team.bid_type === "auto" ? (
                    <ConferenceBadge
                      conference={team.conference}
                      isChampion
                      size="sm"
                    />
                  ) : null}
                </div>
                {!isInField || team.bid_type !== "auto" ? (
                  <ConferenceCaption conference={team.conference} />
                ) : null}
              </div>
              <BidBadge
                bidType={isInField ? team.bid_type : null}
                isFirstOut={isFirstOut}
              />
              <div className="flex w-16 shrink-0 flex-col items-end">
                <span className="text-xs tabular-nums text-foreground">
                  {formatScore(team.composite_score)}
                </span>
                <span
                  className={cn("text-[0.65rem] tabular-nums", deltaColor)}
                  title="Composite score margin to the cut line"
                >
                  {deltaLabel}
                </span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
