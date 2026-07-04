import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

import { FilesystemArtifactStore } from "@/lib/runtime/artifact-store/filesystem";
import type { RunCatalogStore } from "@/lib/runtime/run-catalog-store/types";
import { REPO_DIR } from "@/lib/paths";
import type { RunCatalogResponse } from "@/lib/runCatalog";
import type { RunSummary, RunsPayload } from "@/lib/types";

const DUCKDB_PATH = path.join(REPO_DIR, "data", "output", "selection_room.duckdb");

function pythonBin(): string | null {
  const venv = path.join(REPO_DIR, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return existsSync(path.join(REPO_DIR, "src", "cli", "main.py")) ? "python3" : null;
}

function normalizeRun(row: Record<string, unknown>): RunSummary | null {
  const stem = row.stem;
  const runId = row.run_id;
  const scenarioId = row.scenario_id;
  const label = row.label;
  const season = row.season;
  const week = row.week;
  const ruleset = row.ruleset;
  const dataSource = row.data_source;
  const generatedAt = row.generated_at;
  const weights = row.weights;

  if (
    typeof stem !== "string" ||
    typeof runId !== "string" ||
    typeof scenarioId !== "string" ||
    typeof label !== "string" ||
    typeof season !== "number" ||
    typeof week !== "number" ||
    typeof generatedAt !== "string" ||
    typeof weights !== "object" ||
    weights === null
  ) {
    return null;
  }

  const w = weights as Record<string, unknown>;
  if (
    typeof w.resume !== "number" ||
    typeof w.predictive !== "number" ||
    typeof w.sor !== "number" ||
    typeof w.sos !== "number"
  ) {
    return null;
  }

  const rulesetNorm =
    ruleset === "2024" || ruleset === "2025_plus" ? ruleset : ("2025_plus" as const);
  const dataSourceNorm =
    dataSource === "cfbd" || dataSource === "sample" ? dataSource : ("sample" as const);

  return {
    stem,
    run_id: runId,
    scenario_id: scenarioId,
    season,
    week,
    ruleset: rulesetNorm,
    data_source: dataSourceNorm,
    champion_source:
      typeof row.champion_source === "string" ? row.champion_source : "unknown",
    generated_at: generatedAt,
    has_bracket: Boolean(row.has_bracket),
    has_sensitivity: Boolean(row.has_sensitivity),
    simulator_version:
      typeof row.simulator_version === "string" ? row.simulator_version : "",
    config_hash: typeof row.config_hash === "string" ? row.config_hash : "",
    weights: {
      resume: w.resume,
      predictive: w.predictive,
      sor: w.sor,
      sos: w.sos,
    },
    label,
  };
}

async function loadCatalogFromDuckDb(limit: number): Promise<RunSummary[] | null> {
  if (!existsSync(DUCKDB_PATH)) return null;
  const python = pythonBin();
  if (!python) return null;

  const code = `
import json
from src.store.reader import list_catalog_runs
print(json.dumps(list_catalog_runs(limit=${limit})))
`;

  return new Promise((resolve) => {
    const child = spawn(python, ["-c", code], {
      cwd: REPO_DIR,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn("DuckDB catalog read failed:", stderr.trim() || `exit ${code}`);
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>[];
        const runs = parsed
          .map((row) => normalizeRun(row))
          .filter((row): row is RunSummary => row !== null);
        resolve(runs.length > 0 ? runs : null);
      } catch {
        resolve(null);
      }
    });

    child.on("error", () => resolve(null));
  });
}

export class LocalRunCatalogStore implements RunCatalogStore {
  private readonly artifactStore: FilesystemArtifactStore;

  constructor(artifactRootDir: string) {
    this.artifactStore = new FilesystemArtifactStore(artifactRootDir);
  }

  async loadCatalog(limit = 100): Promise<RunCatalogResponse> {
    const duckRuns = await loadCatalogFromDuckDb(limit);
    if (duckRuns && duckRuns.length > 0) {
      return {
        source: "duckdb",
        runs: duckRuns,
        latest_stem: duckRuns[0]?.stem ?? null,
      };
    }

    const index = await this.artifactStore.getJson<RunsPayload>("runs.json");
    if (index) {
      return {
        source: "runs_json",
        runs: index.runs,
        latest_stem: index.latest?.stem ?? null,
      };
    }

    return { source: "runs_json", runs: [], latest_stem: null };
  }
}
