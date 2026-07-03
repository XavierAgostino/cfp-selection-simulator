import { formatDateTime } from "@/lib/format";
import { formatWeightPercents, truncateConfigHash } from "@/lib/recordMeta";
import type { RunSummary } from "@/lib/types";

/** Primary header title — human label, e.g. "2025 Week 15 · Base". */
export function runPrimaryLabel(run: RunSummary): string {
  return run.label;
}

/** @deprecated Prefer runPrimaryLabel; kept for callers that only need season/week. */
export function runSeasonWeekTitle(run: RunSummary): string {
  return `${run.season} Week ${run.week}`;
}

/** Subtitle under the season/week title. */
export function runProjectionSubtitle(run: RunSummary): string {
  if (run.scenario_id === "base") return "Base projection";
  const parts = run.label.split("·").map((s) => s.trim());
  const tail = parts[parts.length - 1];
  if (tail && tail.toLowerCase() !== "base") return tail;
  return run.scenario_id;
}

export function isBaseRun(run: RunSummary): boolean {
  return run.scenario_id === "base";
}

export function isLiveRun(run: RunSummary): boolean {
  return run.data_source === "cfbd";
}

/** User-facing data source label. */
export function dataSourceLabel(run: RunSummary): string {
  return isLiveRun(run) ? "Live CFBD" : "Sample demo";
}

export function formatWeightsLabeled(weights: RunSummary["weights"]): string {
  const pct = (v: number) => Math.round(v * 100);
  return `Resume ${pct(weights.resume)} · Predictive ${pct(weights.predictive)} · SOR ${pct(weights.sor)} · SOS ${pct(weights.sos)}`;
}

/** Short ruleset label for run catalog rows. */
export function formatRulesetShort(ruleset: RunSummary["ruleset"]): string {
  return ruleset === "2025_plus" ? "2025+" : ruleset;
}

/** Secondary metadata for catalog rows (ruleset + weights + time). */
export function runCatalogSecondary(run: RunSummary): string {
  const parts = [
    dataSourceLabel(run),
    formatRulesetShort(run.ruleset),
    formatWeightPercents(run.weights),
    `Updated ${formatDateTime(run.generated_at)}`,
  ];
  return parts.join(" · ");
}

/** Compact secondary line for run rows (switcher, recent runs). */
export function runRowSecondary(run: RunSummary): string {
  const parts = [
    dataSourceLabel(run),
    formatWeightPercents(run.weights),
    `Updated ${formatDateTime(run.generated_at)}`,
  ];
  return parts.join(" · ");
}

/** Tertiary metadata: updated time and config hash. */
export function runDetailsLine(run: RunSummary): string {
  return `Updated ${formatDateTime(run.generated_at)} · Config ${truncateConfigHash(run.config_hash)}`;
}

export const LIVE_CFBD_HELPER =
  "Uses server-side CollegeFootballData access. Requires a configured CFBD API key on the server.";

export const SAMPLE_DEMO_HELPER =
  "Demo fixture. Records and schedules may be partial, not a full-season live feed.";

export const SEASON_OPTIONS = [2024, 2025, 2026] as const;
export const WEEK_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 1);
