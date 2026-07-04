import type { RunJobRecord, RunJobRequest } from "@/lib/runJob";
import type { ScenarioWeights } from "@/lib/scenarioWeights";

export interface RunJobRow {
  id: string;
  status: RunJobRecord["status"];
  requested_season: number;
  requested_week: number;
  requested_source: RunJobRequest["data_source"];
  requested_ruleset: string | null;
  scenario_weights_json: ScenarioWeights | null;
  run_stem: string | null;
  artifact_base_url: string | null;
  error_message: string | null;
  logs_text: string;
  pid: number | null;
  exit_code: number | null;
  trigger_run_id: string | null;
  created_at: Date | string;
  started_at: Date | string | null;
  finished_at: Date | string | null;
}

export function runJobRecordToRow(job: RunJobRecord): RunJobRow {
  return {
    id: job.job_id,
    status: job.status,
    requested_season: job.request.season,
    requested_week: job.request.week,
    requested_source: job.request.data_source,
    requested_ruleset: null,
    scenario_weights_json: job.request.weights ?? null,
    run_stem: job.stem,
    artifact_base_url: null,
    error_message: job.error,
    logs_text: "",
    pid: job.pid,
    exit_code: job.exit_code,
    trigger_run_id: null,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
  };
}

export function runJobRowToRecord(row: RunJobRow): RunJobRecord {
  const request: RunJobRequest = {
    season: row.requested_season,
    week: row.requested_week,
    data_source: row.requested_source,
  };
  if (row.scenario_weights_json) {
    request.weights = row.scenario_weights_json;
  }

  return {
    job_id: row.id,
    status: row.status,
    created_at: toIsoString(row.created_at),
    started_at: row.started_at ? toIsoString(row.started_at) : null,
    finished_at: row.finished_at ? toIsoString(row.finished_at) : null,
    request,
    stem: row.run_stem,
    error: row.error_message,
    pid: row.pid,
    exit_code: row.exit_code,
  };
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function readLogTailFromText(logsText: string, maxLines: number): string[] {
  const lines = logsText.split("\n").filter((line) => line.length > 0);
  return lines.slice(-maxLines);
}

export function appendLogToText(logsText: string, line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return logsText;
  if (!logsText) return `${trimmed}\n`;
  return `${logsText}${trimmed}\n`;
}

export function resolveStemFromLogsText(logsText: string): string | null {
  for (const line of logsText.split("\n")) {
    const trimmed = line.trim();
    const prefix = "SELECTION_ROOM_EXPORT stem=";
    if (trimmed.startsWith(prefix)) {
      const stem = trimmed.slice(prefix.length).trim();
      if (stem) return stem;
    }
  }
  return null;
}
