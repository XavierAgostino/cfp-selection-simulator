/** Shared score-bar styling — solid fills that read on dark backgrounds. */

export type ScoreMetricKey =
  | "composite"
  | "resume"
  | "predictive"
  | "sor"
  | "sos";

export interface ScoreMetricBarStyle {
  fillClass: string;
}

/** Tailwind classes backed by tokens in globals.css (--bar-fill-*). */
export const SCORE_METRIC_BAR_STYLES: Record<ScoreMetricKey, ScoreMetricBarStyle> =
  {
    composite: { fillClass: "bg-bar-composite" },
    resume: { fillClass: "bg-bar-resume" },
    predictive: { fillClass: "bg-bar-predictive" },
    sor: { fillClass: "bg-bar-sor" },
    sos: { fillClass: "bg-bar-sos" },
  };

export const SCORE_BAR_TRACK_CLASS = "bg-bar-track";

export function scoreBarWidth(value: number): string {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return `${pct}%`;
}
