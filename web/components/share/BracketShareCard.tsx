"use client";

import { ShareCardFrame } from "@/components/share/ShareCardFrame";
import {
  FullBracketCanvas,
  BRACKET_CANVAS_WIDTH,
} from "@/components/bracket/FullBracket";
import type { BracketPayload } from "@/lib/types";

/** Total card width: bracket canvas plus the frame's px-10 gutters. */
export const BRACKET_SHARE_CARD_WIDTH = BRACKET_CANVAS_WIDTH + 80;

interface BracketShareCardProps {
  bracket: BracketPayload;
}

/** The full bracket as a branded broadcast graphic, captured for PNG export. */
export function BracketShareCard({ bracket }: BracketShareCardProps) {
  return (
    <ShareCardFrame
      width={BRACKET_SHARE_CARD_WIDTH}
      contextLabel={`${bracket.season} · Week ${bracket.week}`}
      footnote={
        bracket.ruleset === "2025_plus"
          ? "12-team field · straight seeding (2025+ rules)"
          : "12-team field · 2024 seeding rules"
      }
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Projected {bracket.season} CFP Bracket
        </h2>
        <FullBracketCanvas bracket={bracket} />
      </div>
    </ShareCardFrame>
  );
}
