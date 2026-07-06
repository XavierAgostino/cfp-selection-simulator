"use client";

import { useMemo, useState } from "react";
import {
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLogoDot } from "@/components/charts/ChartLogoDot";
import { TeamHoverContent } from "@/components/team/TeamHoverCard";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type { RankingRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResumePredictiveScatterProps {
  teams: RankingRow[];
}

/** Median of a non-empty numeric list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function paddedDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.1, 0.015);
  return [min - pad, max + pad];
}

/** Status ring color: red = auto bid, blue = at-large, muted = out of the field. */
function ringColor(team: RankingRow): string {
  if (!team.in_field) return "var(--border)";
  return team.bid_type === "auto" ? "var(--accent-red)" : "var(--accent-blue)";
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const team = payload[0].payload as RankingRow;
  return (
    <div className="w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md">
      <TeamHoverContent team={team} />
    </div>
  );
}

function QuadrantLabel({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute hidden text-[0.6rem] uppercase tracking-wide text-muted-foreground/70 sm:block ${className}`}
    >
      {children}
    </span>
  );
}

type ScatterFilter = "all" | "top25" | "field" | "bubble";

const SCATTER_FILTERS: Array<{ id: ScatterFilter; label: string }> = [
  { id: "all", label: "All teams" },
  { id: "top25", label: "Top 25" },
  { id: "field", label: "In field" },
  { id: "bubble", label: "Bubble" },
];

/**
 * Subset of teams for one filter. The bubble is the last four in plus the
 * out-of-field teams within eight ranks of the cut line, matching the
 * rankings table's bubble filter.
 */
function filterTeams(
  teams: RankingRow[],
  filter: ScatterFilter,
  cutRank: number,
): RankingRow[] {
  switch (filter) {
    case "top25":
      return teams.filter((t) => t.rank <= 25);
    case "field":
      return teams.filter((t) => t.in_field);
    case "bubble":
      return teams.filter((t) =>
        t.in_field ? t.rank >= cutRank - 3 : t.rank - cutRank <= 8,
      );
    default:
      return teams;
  }
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full border-[1.5px] bg-card"
        style={{ borderColor: color }}
      />
      {label}
    </span>
  );
}

/**
 * Answers: who has a strong resume versus a strong predictive profile?
 * Every ranked team plotted by the two component scores, split into
 * quadrants at the field medians. Hover for the full score breakdown;
 * click a logo to open the team drawer. The table below carries the same
 * data for keyboard and touch users.
 */
export function ResumePredictiveScatter({ teams }: ResumePredictiveScatterProps) {
  const { openTeam } = useTeamDrawer();
  const [filter, setFilter] = useState<ScatterFilter>("all");

  const cutRank = useMemo(() => {
    const inField = teams.filter((t) => t.in_field);
    if (inField.length === 0) return 0;
    return Math.max(...inField.map((t) => t.rank));
  }, [teams]);

  const visible = useMemo(
    () => filterTeams(teams, filter, cutRank),
    [teams, filter, cutRank],
  );

  // Medians stay fixed at the full-field values so the quadrants keep their
  // meaning; only the plot domain zooms to the visible subset.
  const { xDomain, yDomain, xMedian, yMedian } = useMemo(() => {
    const domainSource = visible.length > 0 ? visible : teams;
    return {
      xDomain: paddedDomain(domainSource.map((t) => t.predictive_score)),
      yDomain: paddedDomain(domainSource.map((t) => t.resume_score)),
      xMedian: median(teams.map((t) => t.predictive_score)),
      yMedian: median(teams.map((t) => t.resume_score)),
    };
  }, [teams, visible]);

  if (teams.length === 0) return null;

  return (
    <Card className="gap-3 border-border bg-card shadow-none">
      <CardHeader className="px-4">
        <CardTitle>
          {METRIC_EXPLANATIONS.resume.label} vs.{" "}
          {METRIC_EXPLANATIONS.predictive.label}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Who has a strong resume versus a strong predictive profile? Quadrants
          split at the field medians. Hover a logo for the full breakdown;
          click to open the team resume.
        </p>
      </CardHeader>
      <CardContent className="px-4">
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter the plotted teams"
        >
          {SCATTER_FILTERS.map((option) => {
            const isActive = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "border-foreground/30 bg-secondary font-semibold text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div
          className="relative"
          role="img"
          aria-label={`Scatter plot of ${visible.length} ranked teams by resume score and predictive score. The same scores appear in the rankings table below.`}
        >
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 14, right: 18, bottom: 6, left: 0 }}>
              <XAxis
                type="number"
                dataKey="predictive_score"
                name={METRIC_EXPLANATIONS.predictive.label}
                domain={xDomain}
                tickCount={6}
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="resume_score"
                name={METRIC_EXPLANATIONS.resume.label}
                domain={yDomain}
                width={44}
                tickCount={6}
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <ZAxis range={[1, 1]} />
              <ReferenceLine
                x={xMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={yMedian}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Tooltip
                content={<ScatterTooltip />}
                cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
              />
              <Scatter
                data={visible}
                isAnimationActive={false}
                shape={(props: unknown) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: RankingRow;
                  };
                  if (cx === undefined || cy === undefined || !payload) {
                    return <g />;
                  }
                  return (
                    <ChartLogoDot
                      cx={cx}
                      cy={cy}
                      team={payload}
                      size={22}
                      ringColor={ringColor(payload)}
                      dimmed={!payload.in_field}
                      onClick={() => openTeam(payload.team)}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <QuadrantLabel className="left-14 top-4">
            Resume ahead of projection
          </QuadrantLabel>
          <QuadrantLabel className="right-5 top-4">
            Complete profile
          </QuadrantLabel>
          <QuadrantLabel className="left-14 bottom-10">
            Below field median
          </QuadrantLabel>
          <QuadrantLabel className="right-5 bottom-10">
            Projection ahead of resume
          </QuadrantLabel>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground">
          <span className="uppercase tracking-wide">
            ↑ {METRIC_EXPLANATIONS.resume.label} · {METRIC_EXPLANATIONS.predictive.label} →
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <LegendSwatch color="var(--accent-red)" label="Auto bid" />
            <LegendSwatch color="var(--accent-blue)" label="At-large" />
            <LegendSwatch color="var(--border)" label="Out of field" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
