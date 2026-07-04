/**
 * Pure formatters for the /validation dashboard. Kept out of the components so
 * the null-handling and rounding rules live in one place.
 */

import type {
  CommitteeValidationRow,
  PredictiveValidationRow,
  SelectionValidationRow,
} from "@/lib/types";
import { predictiveModelLabel } from "@/lib/validationExplain";

/** Ratio (0–1) → whole-percent string, or an em dash when absent. */
export function pct(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Fixed-decimal number, or an em dash when absent. */
export function num(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

/** Clamp a ratio to a 0–100 width for a meter bar. */
export function meterWidth(ratio: number | null | undefined): number {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return 0;
  return Math.max(0, Math.min(100, ratio * 100));
}

/** A plain-language descriptor for how closely the model tracks the committee. */
export function agreementLabel(spearman: number | null | undefined): string {
  if (spearman === null || spearman === undefined) return "unknown";
  if (spearman >= 0.9) return "strong";
  if (spearman >= 0.8) return "close";
  if (spearman >= 0.65) return "moderate";
  return "loose";
}

/** Inclusive season range label, e.g. "2014–2024" or "2024". */
export function seasonRange(years: number[]): string {
  if (years.length === 0) return "—";
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

/** Headline label for field-accuracy card — scoped to validated seasons. */
export function fieldAccuracyHeadlineLabel(selectionYears: number[]): string {
  if (selectionYears.length === 1) {
    return `${selectionYears[0]} Field Accuracy`;
  }
  return "Validated Field Accuracy";
}

/** Subtitle clarifying which seasons the field-accuracy stat covers. */
export function fieldAccuracyScopeSub(selectionYears: number[]): string {
  if (selectionYears.length === 0) {
    return "For seasons included in the validation artifact.";
  }
  if (selectionYears.length === 1) {
    return `For ${selectionYears[0]} only, not all CFP history.`;
  }
  return `For ${seasonRange(selectionYears)} (${selectionYears.length} seasons in this artifact).`;
}

/** Interpretation line under the committee-agreement headline. */
export function committeeHeadlineInterpretation(
  spearman: number | null | undefined,
): string {
  if (spearman === null || spearman === undefined) {
    return "Alignment with top-12 ordering";
  }
  if (spearman >= 0.8) return "Strong alignment with top-12 ordering";
  if (spearman >= 0.65) return "Moderate alignment with top-12 ordering";
  return "Looser alignment with top-12 ordering";
}

/** Interpretation line under the field-accuracy headline. */
export function fieldAccuracyHeadlineInterpretation(
  correctRate: number | null | undefined,
): string {
  if (correctRate === 1) return "Exact field size in every validated season";
  if (correctRate !== null && correctRate !== undefined && correctRate >= 0.8) {
    return "Mostly correct field sizes in validated seasons";
  }
  return "Field sizes match in some validated seasons";
}

/** Interpretation line under the predictive-signal headline. */
export function predictiveSignalHeadlineInterpretation(): string {
  return "Composite win-side accuracy on completed games";
}

/** Plain-English verdict for one committee-alignment season row. */
export function committeeVerdict(row: CommitteeValidationRow): string {
  let line = `In ${row.year}, the model matched ${row.top12_overlap_label} of the committee's top 12 teams`;
  if (row.spearman_top12 !== null) {
    line += ` (rank correlation ${row.spearman_top12.toFixed(2)}, ${agreementLabel(row.spearman_top12)})`;
  }
  line += ".";
  if (row.notes.trim()) {
    return `${line} ${row.notes.trim()}`;
  }
  return line;
}

/** Plain-English verdict for one era-correct selection season row. */
export function selectionVerdict(row: SelectionValidationRow): string {
  const sizePart = row.correct_field_size
    ? "produced the correct field size"
    : "did not match the correct field size";
  let line = `In ${row.year}, the model ${sizePart} under ${row.rule_target} rules (${row.field_overlap_label} field overlap)`;
  const extras: string[] = [];
  if (row.false_positives.length > 0) {
    extras.push(`model added ${row.false_positives.join(", ")}`);
  }
  if (row.false_negatives.length > 0) {
    extras.push(`model dropped ${row.false_negatives.join(", ")}`);
  }
  if (extras.length > 0) {
    line += `; ${extras.join("; ")}`;
  }
  line += ".";
  return line;
}

/** Plain-English verdict for one predictive season block. */
export function predictiveVerdict(
  year: number,
  rows: PredictiveValidationRow[],
): string {
  const composite = rows.find((r) => r.model === "composite");
  const baselines = rows.filter((r) => r.model !== "composite");
  if (!composite) {
    return `Retrospective game-level scoring for ${year} completed games.`;
  }
  if (baselines.length === 0) {
    return `In ${year}, the ${predictiveModelLabel(composite.model)} scored ${pct(composite.win_accuracy)} win-side accuracy on completed games (Brier ${num(composite.brier_score)}).`;
  }
  const beatsAll = baselines.every((b) => composite.win_accuracy >= b.win_accuracy);
  const brierBeatsAll = baselines.every(
    (b) => composite.brier_score <= b.brier_score,
  );
  if (beatsAll && brierBeatsAll) {
    return `In ${year}, the ${predictiveModelLabel(composite.model)} beats listed baselines on both win-side accuracy and Brier score.`;
  }
  if (beatsAll) {
    return `In ${year}, the ${predictiveModelLabel(composite.model)} beats listed baselines on win-side accuracy.`;
  }
  return `In ${year}, the ${predictiveModelLabel(composite.model)} scored ${pct(composite.win_accuracy)} win-side accuracy against simpler baselines.`;
}

/** Format generated_at for the validation artifact footer. */
export function formatValidationGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
