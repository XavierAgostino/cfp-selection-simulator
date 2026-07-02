"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { InfoTooltip } from "@/components/explain/InfoTooltip";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatScore } from "@/lib/format";
import type { TeamSlot } from "@/lib/types";

function BubbleMiniRow({
  team,
  align,
}: {
  team: TeamSlot;
  align: "left" | "right";
}) {
  const { openTeam } = useTeamDrawer();
  return (
    <TeamHoverCard team={team}>
      <button
        type="button"
        onClick={() => openTeam(team.team)}
        aria-label={`Open resume for ${team.team}`}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
          align === "right" ? "flex-row-reverse text-right" : "text-left"
        }`}
      >
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={22}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {team.team}
      </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatScore(team.composite_score)}
        </span>
      </button>
    </TeamHoverCard>
  );
}

interface BubbleSnapshotStripProps {
  lastFourIn: TeamSlot[];
  firstFourOut: TeamSlot[];
}

/** Last four in vs. first four out, with a center cut-line divider — a preview of the full /bubble page. */
export function BubbleSnapshotStrip({
  lastFourIn,
  firstFourOut,
}: BubbleSnapshotStripProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle>Bubble Snapshot</CardTitle>
        <Link
          href="/bubble"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Bubble watch
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last Four In
            </span>
            {lastFourIn.map((team) => (
              <BubbleMiniRow key={team.team} team={team} align="left" />
            ))}
          </div>
          <div className="relative flex justify-center self-stretch">
            <div
              className="h-full w-px bg-gradient-to-b from-transparent via-tag-red-border to-transparent"
              aria-hidden
            />
            <InfoTooltip
              title={METRIC_EXPLANATIONS.cut_line.label}
              content={METRIC_EXPLANATIONS.cut_line.description}
              side="top"
            >
              <span
                tabIndex={0}
                aria-label={`Cut line: ${METRIC_EXPLANATIONS.cut_line.description}`}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-help whitespace-nowrap rounded border border-tag-red-border bg-tag-red-bg px-1.5 text-[0.6rem] font-semibold tracking-widest text-tag-red-text outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                CUT LINE
              </span>
            </InfoTooltip>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 text-right text-xs font-semibold uppercase tracking-wide text-foreground">
              First Four Out
            </span>
            {firstFourOut.map((team) => (
              <BubbleMiniRow key={team.team} team={team} align="right" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
