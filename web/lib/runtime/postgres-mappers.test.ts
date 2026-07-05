import { describe, expect, it } from "vitest";

import {
  appendLogToText,
  readLogTailFromText,
  resolveStemFromLogsText,
  runJobRecordToRow,
  runJobRowToRecord,
} from "@/lib/runtime/job-store/mappers";
import type { RunJobRecord } from "@/lib/runJob";
import { runCatalogRowToSummary } from "@/lib/runtime/run-catalog-store/mappers";

const sampleJob: RunJobRecord = {
  job_id: "run_20250704_120000_abc123",
  status: "queued",
  created_at: "2025-07-04T12:00:00.000Z",
  started_at: null,
  finished_at: null,
  request: { season: 2025, week: 15, data_source: "sample" },
  stem: null,
  error: null,
  pid: null,
  exit_code: null,
  user_id: null,
};

describe("runJob mappers", () => {
  it("round-trips job records", () => {
    const row = runJobRecordToRow(sampleJob);
    expect(row.id).toBe(sampleJob.job_id);
    expect(runJobRowToRecord(row)).toEqual(sampleJob);
  });

  it("parses export stem from logs", () => {
    const logs = appendLogToText("", "SELECTION_ROOM_EXPORT stem=2025_week15");
    expect(resolveStemFromLogsText(logs)).toBe("2025_week15");
    expect(readLogTailFromText(logs, 10)).toEqual(["SELECTION_ROOM_EXPORT stem=2025_week15"]);
  });
});

describe("runCatalog mappers", () => {
  it("maps postgres rows to RunSummary", () => {
    const summary = runCatalogRowToSummary({
      stem: "2025_week15",
      season: 2025,
      week: 15,
      source: "sample",
      ruleset: "2025_plus",
      scenario_id: "base",
      label: "2025 Week 15",
      config_hash: "abc",
      artifact_base_url: "supabase://artifacts/runs/2025_week15/",
      manifest_json: {
        has_bracket: true,
        has_sensitivity: false,
        simulator_version: "3.0.0",
      },
      created_at: "2025-07-04T12:00:00.000Z",
    });

    expect(summary.stem).toBe("2025_week15");
    expect(summary.run_id).toBe("2025_week15");
    expect(summary.has_bracket).toBe(true);
    expect(summary.data_source).toBe("sample");
  });
});
