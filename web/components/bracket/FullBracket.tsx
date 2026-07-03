"use client";

import { Card } from "@/components/ui/card";
import { ScaleToFitCanvas } from "@/components/common/ScaleToFitCanvas";
import { CfpPlayoffLogo } from "@/components/brand/CfpPlayoffLogo";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BracketGame } from "@/components/bracket/BracketGame";
import { podMeta, splitPodsBySide } from "@/components/bracket/types";
import type { BracketPayload, BracketPod } from "@/lib/types";

/** Fixed column widths for the 5-column bracket grid (px). */
const BRACKET_COLUMNS = "300px 230px 280px 230px 300px";
/** Design canvas width: columns + four gap-x-8 gutters (~1468px). */
export const BRACKET_CANVAS_WIDTH = 1468;

interface FullBracketProps {
  bracket: BracketPayload;
}

function ColumnLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 pb-2 text-center">
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

/**
 * Symmetrical 5-column × 3-row CFP bracket: left pods mirror right pods,
 * semifinals and championship centered on the middle row.
 */
export function FullBracket({ bracket }: FullBracketProps) {
  const { top, bottom } = splitPodsBySide(bracket.pods);
  const topSF = bracket.rounds.semifinals.find((s) => s.side === "top");
  const bottomSF = bracket.rounds.semifinals.find((s) => s.side === "bottom");

  const findPod = (quarterfinalId: string): BracketPod | undefined =>
    bracket.pods.find((p) => p.quarterfinal_id === quarterfinalId);

  const leftTop = top[0];
  const leftBottom = top[1];
  const rightTop = bottom[0];
  const rightBottom = bottom[1];

  return (
    <ScaleToFitCanvas designWidth={BRACKET_CANVAS_WIDTH}>
      <div className="py-2" style={{ width: BRACKET_CANVAS_WIDTH }}>
        {/* Column labels */}
        <div
          className="mb-2 grid gap-x-8"
          style={{
            gridTemplateColumns: BRACKET_COLUMNS,
          }}
        >
          <ColumnLabel title="First Round" subtitle="Campus sites · pods" />
          <ColumnLabel title="Semifinal" subtitle="Bowl site" />
          <ColumnLabel title="Championship" />
          <ColumnLabel title="Semifinal" subtitle="Bowl site" />
          <ColumnLabel title="First Round" subtitle="Campus sites · pods" />
        </div>

        {/* Bracket grid */}
        <div
          className="grid items-center gap-x-8"
          style={{
            gridTemplateColumns: BRACKET_COLUMNS,
            gridTemplateRows: "1fr auto 1fr",
            minHeight: "420px",
          }}
        >
          {leftTop ? (
            <div style={{ gridColumn: 1, gridRow: 1 }} className="flex items-center">
              <BracketGame pod={leftTop} className="w-full" />
            </div>
          ) : null}

          {leftBottom ? (
            <div style={{ gridColumn: 1, gridRow: 3 }} className="flex items-center">
              <BracketGame pod={leftBottom} className="w-full" />
            </div>
          ) : null}

          <div style={{ gridColumn: 2, gridRow: 2 }} className="flex items-center">
            <SemifinalCard
              side="left"
              pods={topSF?.pods.map(findPod) ?? []}
              quarterfinalIds={topSF?.pods ?? []}
            />
          </div>

          <div style={{ gridColumn: 3, gridRow: 2 }} className="flex items-center">
            <ChampionshipCard label={bracket.rounds.championship.label} />
          </div>

          <div style={{ gridColumn: 4, gridRow: 2 }} className="flex items-center">
            <SemifinalCard
              side="right"
              pods={bottomSF?.pods.map(findPod) ?? []}
              quarterfinalIds={bottomSF?.pods ?? []}
            />
          </div>

          {rightTop ? (
            <div style={{ gridColumn: 5, gridRow: 1 }} className="flex items-center">
              <BracketGame pod={rightTop} className="w-full" />
            </div>
          ) : null}

          {rightBottom ? (
            <div style={{ gridColumn: 5, gridRow: 3 }} className="flex items-center">
              <BracketGame pod={rightBottom} className="w-full" />
            </div>
          ) : null}
        </div>
      </div>
    </ScaleToFitCanvas>
  );
}

function SemifinalCard({
  side,
  pods,
  quarterfinalIds,
}: {
  side: "left" | "right";
  pods: (BracketPod | undefined)[];
  quarterfinalIds: string[];
}) {
  const sideLabel = side === "left" ? "Left semifinal" : "Right semifinal";

  return (
    <Card size="sm" className="w-full gap-2 border border-border py-3 shadow-none">
      <div className="px-3">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {sideLabel}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
        {quarterfinalIds.map((qfId, i) => {
          const pod = pods[i];
          if (!pod) {
            return (
              <div
                key={qfId}
                className="rounded-md border border-dashed border-border px-2 py-1.5 text-[0.7rem] text-muted-foreground"
              >
                Winner of {qfId}
              </div>
            );
          }
          const meta = podMeta(pod);
          return (
            <div
              key={qfId}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
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
      className="w-full gap-3 border border-accent-gold/50 bg-accent-gold/4 py-4 shadow-[0_0_24px_rgba(166,124,0,0.12)]"
    >
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <CfpPlayoffLogo />
        <div className="text-sm font-semibold text-foreground">{label}</div>
      </div>
      <div className="flex flex-col gap-1.5 px-4">
        {["Winner, left semifinal", "Winner, right semifinal"].map((row, i) => (
          <div key={row}>
            {i === 1 ? (
              <div className="mb-1.5 text-center text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                vs
              </div>
            ) : null}
            <div className="truncate rounded-md border border-border/80 bg-background/50 px-2 py-2 text-center text-[0.7rem] text-muted-foreground">
              {row}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
