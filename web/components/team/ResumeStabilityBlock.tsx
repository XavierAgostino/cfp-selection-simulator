"use client";

import { useActiveRun } from "@/components/team/useActiveRun";
import { useSensitivity } from "@/components/team/useSensitivity";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type { SelectionStabilityTeam, StabilityStatus } from "@/lib/types";

const STATUS_LABEL: Record<StabilityStatus, string> = {
  lock: "Lock",
  likely_in: "Likely In",
  bubble: "Bubble",
  likely_out: "Likely Out",
  out: "Out",
};

function statusColor(status: StabilityStatus): string {
  if (status === "lock" || status === "likely_in") return "var(--accent-blue)";
  if (status === "bubble") return "var(--accent-gold)";
  return "var(--muted-foreground)";
}

function formatPct(frequency: number): string {
  const pct = Math.round(frequency * 1000) / 10;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

/**
 * Compact Selection Stability strip for the team resume (drawer + team page).
 * Renders only when the team is in the run's bubble scope; runs without
 * sensitivity.json (or teams outside the scope) show nothing at all.
 */
export function ResumeStabilityBlock({ team }: { team: string }) {
  const stem = useActiveRun();
  const sensitivity = useSensitivity(stem);

  if (sensitivity.status !== "ready") return null;
  const entry: SelectionStabilityTeam | undefined =
    sensitivity.data.teams.find((t) => t.team === team);
  if (!entry) return null;

  const color = statusColor(entry.status);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-secondary/30 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          title={METRIC_EXPLANATIONS.selection_stability.description}
        >
          {METRIC_EXPLANATIONS.selection_stability.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {STATUS_LABEL[entry.status]} ·{" "}
          <span className="tabular-nums">
            {formatPct(entry.selection_frequency)}
          </span>
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-border/60"
        role="img"
        aria-label={`Selection Stability ${formatPct(entry.selection_frequency)}: made the projected field in ${entry.in_field_count.toLocaleString()} of ${entry.n_scenarios.toLocaleString()} weight scenarios.`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(entry.selection_frequency * 100, 1)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="text-[0.65rem] text-muted-foreground">
        Made the projected field in{" "}
        <span className="font-medium tabular-nums text-foreground">
          {entry.in_field_count.toLocaleString()} of{" "}
          {entry.n_scenarios.toLocaleString()}
        </span>{" "}
        weight scenarios. Varies model weights only — not future game results.
      </p>
    </div>
  );
}
