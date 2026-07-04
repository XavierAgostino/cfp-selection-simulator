import type { DataSource, Ruleset, RunSummary } from "@/lib/types";

export interface RunCatalogRow {
  stem: string;
  season: number;
  week: number;
  source: DataSource;
  ruleset: string | null;
  scenario_id: string;
  label: string | null;
  config_hash: string | null;
  artifact_base_url: string;
  manifest_json: Record<string, unknown> | null;
  created_at: Date | string;
}

export interface CreateRunRecord {
  stem: string;
  season: number;
  week: number;
  source: DataSource;
  ruleset?: string | null;
  scenario_id?: string;
  label?: string | null;
  config_hash?: string | null;
  artifact_base_url: string;
  manifest_json?: Record<string, unknown> | null;
}

const DEFAULT_WEIGHTS = {
  resume: 0.45,
  predictive: 0.25,
  sor: 0.2,
  sos: 0.1,
} as const;

export function runCatalogRowToSummary(row: RunCatalogRow): RunSummary {
  const manifest = row.manifest_json ?? {};
  const weightsRaw = manifest.weights;
  const weights =
    weightsRaw &&
    typeof weightsRaw === "object" &&
    weightsRaw !== null &&
    typeof (weightsRaw as Record<string, unknown>).resume === "number"
      ? {
          resume: (weightsRaw as Record<string, number>).resume,
          predictive: (weightsRaw as Record<string, number>).predictive,
          sor: (weightsRaw as Record<string, number>).sor,
          sos: (weightsRaw as Record<string, number>).sos,
        }
      : { ...DEFAULT_WEIGHTS };

  const ruleset: Ruleset =
    row.ruleset === "2024" || row.ruleset === "2025_plus" ? row.ruleset : "2025_plus";

  return {
    stem: row.stem,
    run_id: `${row.season}_week${row.week}`,
    scenario_id: row.scenario_id,
    season: row.season,
    week: row.week,
    ruleset,
    data_source: row.source,
    champion_source:
      typeof manifest.champion_source === "string" ? manifest.champion_source : "unknown",
    generated_at: toIsoString(row.created_at),
    has_bracket: Boolean(manifest.has_bracket),
    has_sensitivity: Boolean(manifest.has_sensitivity),
    simulator_version:
      typeof manifest.simulator_version === "string" ? manifest.simulator_version : "",
    config_hash: row.config_hash ?? "",
    weights,
    label: row.label ?? row.stem,
  };
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
