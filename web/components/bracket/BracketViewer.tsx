"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BracketGame } from "@/components/bracket/BracketGame";
import { ConnectorLines } from "@/components/bracket/ConnectorLines";
import { RoundView } from "@/components/bracket/RoundView";
import { MatchupCards } from "@/components/bracket/MatchupCards";
import { BRACKET_VIEW_MODES, splitPodsBySide } from "@/components/bracket/types";
import type { BracketViewMode } from "@/components/bracket/types";
import type { BracketPayload, BracketPod } from "@/lib/types";

interface BracketViewerProps {
  bracket: BracketPayload;
}

export function BracketViewer({ bracket }: BracketViewerProps) {
  const [mode, setMode] = useState<BracketViewMode>("full");

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
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
          Share
        </Button>
      </div>

      {mode === "full" ? <FullBracket bracket={bracket} /> : null}
      {mode === "rounds" ? <RoundView bracket={bracket} /> : null}
      {mode === "matchups" ? <MatchupCards bracket={bracket} /> : null}
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
        className="grid min-w-[1180px] gap-x-2 py-4"
        style={{
          gridTemplateColumns:
            "minmax(230px,1fr) 36px minmax(200px,1fr) 36px minmax(190px,1fr) 36px minmax(200px,1fr) 36px minmax(230px,1fr)",
          gridTemplateRows: "repeat(4, minmax(150px, auto))",
        }}
      >
        {/* Top pods */}
        {top.map((pod, i) => (
          <div key={pod.pod_id} style={{ gridColumn: 1, gridRow: i + 1 }} className="flex items-center">
            <BracketGame pod={pod} className="w-full" />
          </div>
        ))}
        <div style={{ gridColumn: 2, gridRow: "1 / span 2" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" />
        </div>
        <div style={{ gridColumn: 3, gridRow: "1 / span 2" }} className="flex items-center">
          <PlaceholderCard
            title="Semifinal"
            subtitle="Top bracket"
            rows={
              topSF?.pods.map((qfId) => {
                const pod = findPod(qfId);
                return pod ? `No. ${pod.bye.seed} seed pod (${qfId})` : qfId;
              }) ?? []
            }
          />
        </div>
        <div style={{ gridColumn: 4, gridRow: "1 / span 4" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" />
        </div>
        <div style={{ gridColumn: 5, gridRow: "1 / span 4" }} className="flex items-center">
          <PlaceholderCard
            title={bracket.rounds.championship.label}
            subtitle="National Champion"
            rows={["Winner — top semifinal", "Winner — bottom semifinal"]}
            accent="gold"
          />
        </div>
        <div style={{ gridColumn: 6, gridRow: "1 / span 4" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" flip />
        </div>
        <div style={{ gridColumn: 7, gridRow: "3 / span 2" }} className="flex items-center">
          <PlaceholderCard
            title="Semifinal"
            subtitle="Bottom bracket"
            rows={
              bottomSF?.pods.map((qfId) => {
                const pod = findPod(qfId);
                return pod ? `No. ${pod.bye.seed} seed pod (${qfId})` : qfId;
              }) ?? []
            }
          />
        </div>
        <div style={{ gridColumn: 8, gridRow: "3 / span 2" }} className="h-full">
          <ConnectorLines className="h-full w-full text-border" flip />
        </div>
        {/* Bottom pods */}
        {bottom.map((pod, i) => (
          <div
            key={pod.pod_id}
            style={{ gridColumn: 9, gridRow: i + 3 }}
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

function PlaceholderCard({
  title,
  subtitle,
  rows,
  accent = "default",
}: {
  title: string;
  subtitle: string;
  rows: string[];
  accent?: "default" | "gold";
}) {
  return (
    <Card
      size="sm"
      className={`w-full gap-2 border-dashed py-3 shadow-none ${
        accent === "gold" ? "border-accent-gold/40 bg-accent-gold/[0.03]" : "border-border"
      }`}
    >
      <div className="px-3">
        <div
          className={`text-xs font-semibold uppercase tracking-wide ${
            accent === "gold" ? "text-accent-gold" : "text-foreground"
          }`}
        >
          {title}
        </div>
        <div className="text-[0.65rem] text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
        {rows.map((row) => (
          <div
            key={row}
            className="truncate rounded border border-dashed border-border px-2 py-1 text-[0.7rem] text-muted-foreground"
          >
            {row}
          </div>
        ))}
      </div>
    </Card>
  );
}
