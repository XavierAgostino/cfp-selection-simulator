"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BracketGame } from "@/components/bracket/BracketGame";
import { BracketSummaries } from "@/components/bracket/BracketSummaries";
import { ConnectorLines } from "@/components/bracket/ConnectorLines";
import { RoundView } from "@/components/bracket/RoundView";
import { MatchupCards } from "@/components/bracket/MatchupCards";
import { BRACKET_VIEW_MODES, podMeta, splitPodsBySide } from "@/components/bracket/types";
import type { BracketViewMode } from "@/components/bracket/types";
import type { BracketPayload, BracketPod } from "@/lib/types";

interface BracketViewerProps {
  bracket: BracketPayload;
}

export function BracketViewer({ bracket }: BracketViewerProps) {
  const [mode, setMode] = useState<BracketViewMode>("full");

  async function handleShare() {
    const url = window.location.href;
    const title = `Projected ${bracket.season} CFP bracket — Week ${bracket.week}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // User dismissed the share sheet — not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Bracket link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="outline"
          value={[mode]}
          onValueChange={(value) => {
            const next = value[0] as BracketViewMode | undefined;
            if (next) setMode(next);
          }}
        >
          {BRACKET_VIEW_MODES.map((m) => (
            <ToggleGroupItem key={m.value} value={m.value} className="px-3 text-xs">
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 data-icon="inline-start" />
          Share bracket
        </Button>
      </div>

      {mode === "full" ? (
        <>
          <FullBracket bracket={bracket} />
          <BracketSummaries bracket={bracket} />
        </>
      ) : null}
      {mode === "rounds" ? <RoundView bracket={bracket} /> : null}
      {mode === "matchups" ? <MatchupCards bracket={bracket} /> : null}
    </div>
  );
}

function ColumnLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 pb-1 text-center">
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">
        {title}
      </span>
      {subtitle ? (
        <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

function FullBracket({ bracket }: { bracket: BracketPayload }) {
  const { top, bottom } = splitPodsBySide(bracket.pods);
  const topSF = bracket.rounds.semifinals.find((s) => s.side === "top");
  const bottomSF = bracket.rounds.semifinals.find((s) => s.side === "bottom");

  const findPod = (quarterfinalId: string): BracketPod | undefined =>
    bracket.pods.find((p) => p.quarterfinal_id === quarterfinalId);

  return (
    <ScrollArea className="w-full">
      <div
        className="grid min-w-[1120px] gap-x-1.5 py-4"
        style={{
          gridTemplateColumns:
            "minmax(250px,1fr) 26px minmax(190px,1fr) 26px minmax(190px,1fr) 26px minmax(190px,1fr) 26px minmax(250px,1fr)",
          gridTemplateRows: "auto repeat(4, minmax(160px, auto))",
        }}
      >
        {/* CFP round labels */}
        <div style={{ gridColumn: 1, gridRow: 1 }}>
          <ColumnLabel title="First Round" subtitle="Campus sites · pods" />
        </div>
        <div style={{ gridColumn: 3, gridRow: 1 }}>
          <ColumnLabel title="Semifinal" subtitle="Bowl site" />
        </div>
        <div style={{ gridColumn: 5, gridRow: 1 }}>
          <ColumnLabel title="Championship" />
        </div>
        <div style={{ gridColumn: 7, gridRow: 1 }}>
          <ColumnLabel title="Semifinal" subtitle="Bowl site" />
        </div>
        <div style={{ gridColumn: 9, gridRow: 1 }}>
          <ColumnLabel title="First Round" subtitle="Campus sites · pods" />
        </div>

        {/* Top pods */}
        {top.map((pod, i) => (
          <div key={pod.pod_id} style={{ gridColumn: 1, gridRow: i + 2 }} className="flex items-center">
            <BracketGame pod={pod} className="w-full" />
          </div>
        ))}
        <div style={{ gridColumn: 2, gridRow: "2 / span 2" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" />
        </div>
        <div style={{ gridColumn: 3, gridRow: "2 / span 2" }} className="flex items-center">
          <SemifinalCard
            pods={topSF?.pods.map(findPod) ?? []}
            quarterfinalIds={topSF?.pods ?? []}
          />
        </div>
        <div style={{ gridColumn: 4, gridRow: "2 / span 4" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" />
        </div>
        <div style={{ gridColumn: 5, gridRow: "2 / span 4" }} className="flex items-center">
          <ChampionshipCard label={bracket.rounds.championship.label} />
        </div>
        <div style={{ gridColumn: 6, gridRow: "2 / span 4" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" flip />
        </div>
        <div style={{ gridColumn: 7, gridRow: "4 / span 2" }} className="flex items-center">
          <SemifinalCard
            pods={bottomSF?.pods.map(findPod) ?? []}
            quarterfinalIds={bottomSF?.pods ?? []}
          />
        </div>
        <div style={{ gridColumn: 8, gridRow: "4 / span 2" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" flip />
        </div>
        {/* Bottom pods */}
        {bottom.map((pod, i) => (
          <div
            key={pod.pod_id}
            style={{ gridColumn: 9, gridRow: i + 4 }}
            className="flex items-center"
          >
            <BracketGame pod={pod} className="w-full" />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

/**
 * A semifinal slot: which two pods feed it, each anchored by its bye team —
 * the visual answer to "which pod feeds which semifinal?".
 */
function SemifinalCard({
  pods,
  quarterfinalIds,
}: {
  pods: (BracketPod | undefined)[];
  quarterfinalIds: string[];
}) {
  return (
    <Card size="sm" className="w-full gap-2 border-dashed border-border py-3 shadow-none">
      <div className="flex flex-col gap-1.5 px-3">
        {quarterfinalIds.map((qfId, i) => {
          const pod = pods[i];
          if (!pod) {
            return (
              <div
                key={qfId}
                className="rounded border border-dashed border-border px-2 py-1.5 text-[0.7rem] text-muted-foreground"
              >
                Winner of {qfId}
              </div>
            );
          }
          const meta = podMeta(pod);
          return (
            <div
              key={qfId}
              className="flex items-center gap-2 rounded border border-dashed border-border px-2 py-1.5"
            >
              <SeedBadge seed={pod.bye.seed} isBye={pod.bye.is_bye} />
              <TeamLogoTile
                team={pod.bye.team}
                logoUrl={pod.bye.logo_url}
                abbreviation={pod.bye.abbreviation}
                primaryColor={pod.bye.primary_color}
                size={20}
              />
              <span className="min-w-0 truncate text-[0.7rem] text-muted-foreground">
                Pod {meta.letter} winner
              </span>
              <span className="ml-auto shrink-0 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                {qfId}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ChampionshipCard({ label }: { label: string }) {
  return (
    <Card
      size="sm"
      className="w-full gap-2 border-dashed border-accent-gold/40 bg-accent-gold/[0.03] py-3 shadow-none"
    >
      <div className="px-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold">
          {label}
        </div>
        <div className="text-[0.65rem] text-muted-foreground">National Champion</div>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
        {["Winner — top semifinal", "Winner — bottom semifinal"].map((row) => (
          <div
            key={row}
            className="truncate rounded border border-dashed border-border px-2 py-1.5 text-[0.7rem] text-muted-foreground"
          >
            {row}
          </div>
        ))}
      </div>
    </Card>
  );
}
