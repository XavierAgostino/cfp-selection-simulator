import { formatDataSourceLabel as formatDataSourceChipLabel } from "@/lib/displayLabels";
import { formatDate, formatDateTime } from "@/lib/format";
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

/** Scenario variant name without the "projection" suffix (e.g. "Base", "w33-25-32-10"). */
function runVariantName(run: RunSummary): string {
  if (run.scenario_id === "base") return "Base";
  const parts = run.label.split("·").map((s) => s.trim());
  const tail = parts[parts.length - 1];
  if (tail && tail.toLowerCase() !== "base") return tail;
  return run.scenario_id;
}

/** Header H1: "2025 Week 15 · Base Projection". */
export function runHeaderTitle(run: RunSummary): string {
  return `${run.season} Week ${run.week} · ${runVariantName(run)} Projection`;
}

/** Header subline: ruleset format plus bracket readiness. */
export function runHeaderSubline(run: RunSummary): string {
  const parts = [`${formatRulesetShort(run.ruleset)} format`];
  if (run.has_bracket) parts.push("Bracket ready");
  return parts.join(" · ");
}

/**
 * Dominant source signal for the run header. One large, color-coded badge that
 * tells the reader what kind of data they are looking at before anything else:
 * a real CFBD run, a static sample, or a weight-variant scenario. Scenario wins
 * over source so the comparison context reads first. Purely presentational —
 * the run's mode/selection behavior is unchanged.
 */
export type RunSourceTone = "live" | "sample" | "scenario" | "final";

export interface RunSourceBadgeInfo {
  label: string;
  tone: RunSourceTone;
  /** Short context sentence rendered under the badge. */
  description: string;
}

export function runSourceBadge(run: RunSummary): RunSourceBadgeInfo {
  if (!isBaseRun(run)) {
    return {
      label: "Scenario",
      tone: "scenario",
      description: `Weight-variant projection (${runVariantName(run)}), for comparison against the base run.`,
    };
  }
  if (isLiveRun(run)) {
    return {
      label: "Live data",
      tone: "live",
      description:
        "Real CollegeFootballData results through the selected week. A model projection, not an official CFP forecast.",
    };
  }
  return {
    label: "Sample",
    tone: "sample",
    description: SAMPLE_DEMO_HELPER,
  };
}

export function isBaseRun(run: RunSummary): boolean {
  return run.scenario_id === "base";
}

export function isLiveRun(run: RunSummary): boolean {
  return run.data_source === "cfbd";
}

/** User-facing data source label. */
export function dataSourceLabel(run: RunSummary): string {
  return formatDataSourceChipLabel(run.data_source);
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

/** Config-hash fragment on its own, for the run header's freshness row. */
export function runConfigLabel(run: RunSummary): string {
  return `Config ${truncateConfigHash(run.config_hash)}`;
}

/**
 * How current a run is, tone-classified against the weekly official-run cadence.
 * Live runs track the real season, so their age is meaningful ("3 days ago").
 * Sample runs are static fixtures — showing them as N-years "stale" would be
 * misleading, so they get a neutral "generated on" framing with no relative age.
 */
export type FreshnessTone = "fresh" | "aging" | "stale" | "static";

export interface RunFreshnessInfo {
  tone: FreshnessTone;
  /** Lead label, e.g. "Updated 3 days ago" or "Generated Dec 7, 2025". */
  label: string;
  /** Absolute timestamp for the hover tooltip. */
  detail: string;
  /** True only for live CFBD runs — the ones a relative age applies to. */
  live: boolean;
}

const DAY_MS = 86_400_000;

function relativeDayPhrase(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks ago`;
}

export function runFreshness(
  run: RunSummary,
  now: Date = new Date(),
): RunFreshnessInfo {
  const detail = formatDateTime(run.generated_at);
  const live = isLiveRun(run);
  const generated = new Date(run.generated_at).getTime();

  // Sample fixtures aren't "stale"; frame them by generation date, neutral tone.
  if (!live || Number.isNaN(generated)) {
    return {
      tone: "static",
      label: `Generated ${formatDate(run.generated_at)}`,
      detail,
      live,
    };
  }

  const days = Math.max(0, Math.floor((now.getTime() - generated) / DAY_MS));
  // Weekly official run lands ~every 7 days: ≤8d current, ≤16d a cycle behind.
  const tone: FreshnessTone = days <= 8 ? "fresh" : days <= 16 ? "aging" : "stale";
  return { tone, label: `Updated ${relativeDayPhrase(days)}`, detail, live };
}

export const LIVE_CFBD_HELPER =
  "Uses server-side CollegeFootballData access. Requires a configured CFBD API key on the server.";

export const SAMPLE_DEMO_HELPER =
  "Sample data — records and schedules may be partial, not a full-season live feed.";

export const SEASON_OPTIONS = [2024, 2025, 2026] as const;
export const WEEK_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 1);
