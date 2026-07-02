"use client";

import { useMemo } from "react";
import {
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartLogoDot } from "@/components/charts/ChartLogoDot";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { formatScore } from "@/lib/format";
import type { TeamSlot } from "@/lib/types";

type CutGroup = "last-in" | "first-out" | "next-out";

interface CutlineDatum extends TeamSlot {
  cutGroup: CutGroup;
  /** Lane position: in-field teams above the axis, out teams below. */
  lane: number;
  /** Composite-score distance to the cut line (positive = inside). */
  margin: number;
}

interface BubbleCutlineChartProps {
  lastFourIn: TeamSlot[];
  firstFourOut: TeamSlot[];
  nextFourOut?: TeamSlot[];
  /** "mini" is the dashboard snapshot: shorter, no axis, bubble groups only. */
  variant?: "full" | "mini";
}

const GROUP_LABEL: Record<CutGroup, string> = {
  "last-in": "In the field — last four in",
  "first-out": "First four out",
  "next-out": "Next four out",
};

/** Alternate two heights within a lane so near-identical scores don't stack. */
function laneY(direction: 1 | -1, index: number): number {
  return direction * (index % 2 === 0 ? 0.75 : 1.35);
}

function CutlineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const team = payload[0].payload as CutlineDatum;
  const marginLabel =
    team.margin === 0
      ? "On the cut line"
      : `${team.margin > 0 ? "+" : "−"}${formatScore(Math.abs(team.margin))} vs. cut line`;
  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <TeamLogoTile
          team={team.team}
          logoUrl={team.logo_url}
          abbreviation={team.abbreviation}
          primaryColor={team.primary_color}
          size={24}
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">
            <span className="mr-1 text-muted-foreground">#{team.rank}</span>
            {team.team}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">
            {GROUP_LABEL[team.cutGroup]}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4 text-[0.65rem] tabular-nums">
        <span className="text-muted-foreground">
          Composite {formatScore(team.composite_score)}
        </span>
        <span
          className={
            team.margin >= 0 ? "font-medium text-foreground" : "text-tag-red-text"
          }
        >
          {marginLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * Answers: who is closest to the selection cut line, and why? Bubble teams
 * as a logo strip along the composite-score axis — in-field teams above the
 * spine, teams out of the field below it, the cut gap shaded between the
 * last team in and the first team out. Hover for the exact margin; click a
 * logo to open the team resume. The bubble columns carry the same teams for
 * keyboard and touch users.
 */
export function BubbleCutlineChart({
  lastFourIn,
  firstFourOut,
  nextFourOut = [],
  variant = "full",
}: BubbleCutlineChartProps) {
  const { openTeam } = useTeamDrawer();
  const mini = variant === "mini";

  const cutScore = lastFourIn[lastFourIn.length - 1]?.composite_score ?? 0;

  const { data, xDomain, gapStart } = useMemo(() => {
    const outTeams: [TeamSlot[], CutGroup][] = mini
      ? [[firstFourOut, "first-out"]]
      : [
          [firstFourOut, "first-out"],
          [nextFourOut, "next-out"],
        ];
    const rows: CutlineDatum[] = [
      ...lastFourIn.map((team, i) => ({
        ...team,
        cutGroup: "last-in" as const,
        lane: laneY(1, i),
        margin: team.composite_score - cutScore,
      })),
      ...outTeams.flatMap(([teams, cutGroup], groupIndex) =>
        teams.map((team, i) => ({
          ...team,
          cutGroup,
          lane: laneY(-1, i + groupIndex),
          margin: team.composite_score - cutScore,
        })),
      ),
    ];
    const scores = rows.map((r) => r.composite_score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const pad = Math.max((max - min) * 0.08, 0.008);
    return {
      data: rows,
      xDomain: [min - pad, max + pad] as [number, number],
      gapStart: firstFourOut[0]?.composite_score ?? cutScore,
    };
  }, [lastFourIn, firstFourOut, nextFourOut, mini, cutScore]);

  if (data.length === 0) return null;

  return (
    <div
      className="relative"
      role="img"
      aria-label={`Cut line strip: ${lastFourIn.length} teams inside the field above the axis, ${
        data.length - lastFourIn.length
      } bubble teams below it, positioned by composite score. The same teams appear in the bubble lists.`}
    >
      <ResponsiveContainer width="100%" height={mini ? 104 : 180}>
        <ScatterChart
          margin={{ top: 14, right: 14, bottom: mini ? 0 : 4, left: 14 }}
        >
          <XAxis
            type="number"
            dataKey="composite_score"
            domain={xDomain}
            hide={mini}
            tickCount={6}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis type="number" dataKey="lane" domain={[-2, 2]} hide />
          <ZAxis range={[1, 1]} />
          <ReferenceArea
            x1={gapStart}
            x2={cutScore}
            fill="var(--accent-red)"
            fillOpacity={0.07}
            stroke="none"
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <ReferenceLine
            x={cutScore}
            stroke="var(--accent-red)"
            strokeDasharray="4 3"
            label={{
              value: "CUT LINE",
              position: "top",
              fill: "var(--accent-red)",
              fontSize: 9,
              fontWeight: 700,
            }}
          />
          <Tooltip
            content={<CutlineTooltip />}
            cursor={false}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
          />
          <Scatter
            data={data}
            isAnimationActive={false}
            shape={(props: unknown) => {
              const { cx, cy, payload } = props as {
                cx?: number;
                cy?: number;
                payload?: CutlineDatum;
              };
              if (cx === undefined || cy === undefined || !payload) {
                return <g />;
              }
              return (
                <ChartLogoDot
                  cx={cx}
                  cy={cy}
                  team={payload}
                  size={mini ? 20 : 26}
                  ringColor={
                    payload.cutGroup === "last-in"
                      ? "var(--accent-blue)"
                      : "var(--border)"
                  }
                  dimmed={payload.cutGroup === "next-out"}
                  onClick={() => openTeam(payload.team)}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 top-2 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground/80"
      >
        In
      </span>
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground/80 ${
          mini ? "bottom-2" : "bottom-8"
        }`}
      >
        Out
      </span>
    </div>
  );
}
