import type { RunSummary } from "@/lib/types";

import type { CreateRunRecord } from "@/lib/runtime/run-catalog-store/mappers";

export type RunCatalogSource = "duckdb" | "runs_json" | "postgres";

export interface RunCatalogResponse {
  source: RunCatalogSource;
  runs: RunSummary[];
  latest_stem: string | null;
}

export interface RunCatalogStore {
  loadCatalog(limit?: number): Promise<RunCatalogResponse>;
  createRun(record: CreateRunRecord): Promise<void>;
  getRun(stem: string): Promise<RunSummary | null>;
}

export type { CreateRunRecord };
