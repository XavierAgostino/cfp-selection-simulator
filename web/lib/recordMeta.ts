import type { RecordMeta, RecordLabel } from "@/lib/types";

const RECORD_LABELS: Record<RecordLabel, string> = {
  fbs_record: "FBS record",
  demo_record: "Demo record",
  model_window_record: "Model-window record",
};

export function recordColumnLabel(meta: RecordMeta | null | undefined): string {
  if (!meta) return "Record";
  return RECORD_LABELS[meta.record_label] ?? "Record";
}

export function recordColumnTooltip(meta: RecordMeta | null | undefined): string {
  if (!meta) {
    return "Wins and losses across all games in this run's data window.";
  }

  const parts: string[] = [];
  if (meta.record_label === "demo_record" || meta.is_demo_fixture) {
    parts.push(
      "Partial demo fixture, not a full-season record. Games in this sample start mid-season.",
    );
  } else if (meta.record_label === "model_window_record") {
    parts.push(
      `Record reflects the model window (weeks ${meta.record_start_week}–${meta.through_week}), not necessarily the full season.`,
    );
  } else {
    parts.push(
      `FBS vs FBS results through week ${meta.through_week}. Non-FBS opponents are excluded.`,
    );
  }

  if (meta.includes_ccg) {
    parts.push("Conference championship games are included when available.");
  }

  return parts.join(" ");
}

/** Short caption for resume headers (week window + label). */
export function recordSummaryLine(meta: RecordMeta | null | undefined): string | null {
  if (!meta) return null;
  const label = RECORD_LABELS[meta.record_label] ?? "Record";
  return `${label} · weeks ${meta.record_start_week}–${meta.through_week}`;
}

export function formatWeightPercents(weights: {
  resume: number;
  predictive: number;
  sor: number;
  sos: number;
}): string {
  const pct = (v: number) => Math.round(v * 100);
  return `${pct(weights.resume)} / ${pct(weights.predictive)} / ${pct(weights.sor)} / ${pct(weights.sos)}`;
}

export function truncateConfigHash(hash: string, length = 6): string {
  return hash.slice(0, length);
}
