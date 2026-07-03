"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FullBracket } from "@/components/bracket/FullBracket";
import { BracketSummaries } from "@/components/bracket/BracketSummaries";
import { RulesetBanner } from "@/components/bracket/RulesetBanner";
import { RoundView } from "@/components/bracket/RoundView";
import { MatchupCards } from "@/components/bracket/MatchupCards";
import { BRACKET_VIEW_MODES } from "@/components/bracket/types";
import type { BracketViewMode } from "@/components/bracket/types";
import type { BracketPayload } from "@/lib/types";

interface BracketViewerProps {
  bracket: BracketPayload;
}

export function BracketViewer({ bracket }: BracketViewerProps) {
  const [mode, setMode] = useState<BracketViewMode>("full");

  async function handleShare() {
    const url = window.location.href;
    const title = `Projected ${bracket.season} CFP bracket, Week ${bracket.week}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
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
          <RulesetBanner ruleset={bracket.ruleset} />
          <FullBracket bracket={bracket} />
          <BracketSummaries bracket={bracket} />
          <p className="text-center text-xs text-muted-foreground">
            Selection Room is an independent analytics project and is not affiliated with
            the College Football Playoff.
          </p>
        </>
      ) : null}
      {mode === "rounds" ? <RoundView bracket={bracket} /> : null}
      {mode === "matchups" ? <MatchupCards bracket={bracket} /> : null}
    </div>
  );
}
