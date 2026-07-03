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
import type {
  SelectionStabilityTeam,
  SensitivityPayload,
  StabilityStatus,
} from "@/lib/types";

interface StabilityDatum extends SelectionStabilityTeam {
  /** selection_frequency as a 0-100 percentage for the X axis. */
  pct: number;
  /** Row index (0 = most stable) for the Y axis. */
  row: number;
}

const STATUS_LABEL: Record<StabilityStatus, string> = {
  lock: "Lock",
  likely_in: "Likely In",
  bubble: "Bubble",
  likely_out: "Likely Out",
  out: "Out",
};

const STATUS_ORDER: StabilityStatus[] = [
  "lock",
  "likely_in",
  "bubble",
  "likely_out",
  "out",
];

const BASE_STATUS_LABEL: Record<
  SelectionStabilityTeam["base_status"],
  string
> = {
  in_field: "In the projected field",
  first_out: "First four out",
  next_out: "Next four out",
  out: "Outside the bubble",
};

const RISK_LABEL: Record<SelectionStabilityTeam["primary_risk"], string | null> =
  {
    none: null,
    weight_sensitivity: "Weight sensitivity",
    auto_bid_displacement: "Auto-bid displacement",
    composite_gap: "Composite gap to the cut line",
  };

function ringColor(status: StabilityStatus): string {
  if (status === "lock" || status === "likely_in") return "var(--accent-blue)";
  if (status === "bubble") return "var(--accent-gold)";
  return "var(--border)";
}

function formatPct(frequency: number): string {
  const pct = Math.round(frequency * 1000) / 10;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

function StabilityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const team = payload[0].payload as StabilityDatum;
  const risk = RISK_LABEL[team.primary_risk];
  const baseResult = team.base_selected
    ? team.base_seed !== null
      ? `In the projected field — No. ${team.base_seed} seed`
      : "In the projected field"
    : BASE_STATUS_LABEL[team.base_status];
  return (
    <div className="w-64 rounded-md border border-border bg-popover p-2.5 text-popover-foreground shadow-md">
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
            <span className="mr-1 text-muted-foreground">
              #{team.base_rank}
            </span>
            {team.team}
          </div>
          <div className="text-[0.65rem] text-muted-foreground">
            {STATUS_LABEL[team.status]} · {formatPct(team.selection_frequency)}{" "}
            stability
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 text-[0.65rem] text-muted-foreground">
        <span>
          Made the field in{" "}
          <span className="font-medium tabular-nums text-foreground">
            {team.in_field_count.toLocaleString()} of{" "}
            {team.n_scenarios.toLocaleString()}
          </span>{" "}
          weight scenarios.
        </span>
        <span>
          Base result:{" "}
          <span className="font-medium text-foreground">{baseResult}</span>
        </span>
        <span>
          Median rank across scenarios:{" "}
          <span className="font-medium tabular-nums text-foreground">
            #{team.median_rank}
          </span>
        </span>
        {risk ? (
          <span>
            Primary risk:{" "}
            <span className="font-medium text-foreground">{risk}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Selection Stability board: every bubble-scope team on a 0-100% axis showing
 * how often it kept its spot when the model weights were perturbed (±10%
 * relative, renormalized) across the run's Monte Carlo scenarios. One row per
 * team, most stable at the top; zone bands mark the five status levels. It
 * varies model weights only — never future game outcomes.
 */
export function SelectionStabilityBoard({
  sensitivity,
}: {
  sensitivity: SensitivityPayload;
}) {
  const { openTeam } = useTeamDrawer();

  const { data, statusCounts } = useMemo(() => {
    const rows = [...sensitivity.teams]
      .sort(
        (a, b) =>
          b.selection_frequency - a.selection_frequency ||
          a.base_rank - b.base_rank,
      )
      .map((team, index) => ({
        ...team,
        pct: team.selection_frequency * 100,
        row: index,
      }));
    const counts = new Map<StabilityStatus, number>();
    for (const team of rows) {
      counts.set(team.status, (counts.get(team.status) ?? 0) + 1);
    }
    return { data: rows, statusCounts: counts };
  }, [sensitivity.teams]);

  if (data.length === 0) return null;

  const rowHeight = 30;
  const height = 46 + data.length * rowHeight;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_ORDER.map((status) => {
          const count = statusCounts.get(status) ?? 0;
          return (
            <span
              key={status}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium ${
                count > 0
                  ? "text-foreground"
                  : "text-muted-foreground/60"
              }`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ringColor(status) }}
              />
              {STATUS_LABEL[status]}
              <span className="tabular-nums text-muted-foreground">
                {count}
              </span>
            </span>
          );
        })}
      </div>

      <div
        role="img"
        aria-label={`Selection Stability board: ${data.length} bubble-scope teams positioned by how often they made the projected field across ${sensitivity.n_scenarios.toLocaleString()} weight scenarios, most stable at the top.`}
      >
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 8, right: 18, bottom: 4, left: 18 }}>
            <XAxis
              type="number"
              dataKey="pct"
              domain={[-2, 102]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="row"
              domain={[-0.6, data.length - 0.4]}
              reversed
              hide
            />
            <ZAxis range={[1, 1]} />
            <ReferenceArea
              x1={-2}
              x2={25}
              fill="var(--accent-red)"
              fillOpacity={0.05}
              stroke="none"
            />
            <ReferenceArea
              x1={25}
              x2={75}
              fill="var(--accent-gold)"
              fillOpacity={0.05}
              stroke="none"
            />
            <ReferenceArea
              x1={75}
              x2={102}
              fill="var(--accent-blue)"
              fillOpacity={0.05}
              stroke="none"
            />
            {[25, 50, 75].map((x) => (
              <ReferenceLine
                key={x}
                x={x}
                stroke="var(--border)"
                strokeDasharray="4 3"
              />
            ))}
            <Tooltip
              content={<StabilityTooltip />}
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
                  payload?: StabilityDatum;
                };
                if (cx === undefined || cy === undefined || !payload) {
                  return <g />;
                }
                return (
                  <ChartLogoDot
                    cx={cx}
                    cy={cy}
                    team={payload}
                    size={24}
                    ringColor={ringColor(payload.status)}
                    dimmed={payload.status === "out"}
                    onClick={() => openTeam(payload.team)}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[0.65rem] text-muted-foreground">
        Based on {sensitivity.n_scenarios.toLocaleString()} scenarios that vary
        each model weight by ±
        {Math.round(sensitivity.perturbation_spec.relative_range * 100)}%.
        Selection Stability changes model weights around the current run — it
        does not simulate future game outcomes, and conference champions stay
        fixed.
      </p>
    </div>
  );
}
