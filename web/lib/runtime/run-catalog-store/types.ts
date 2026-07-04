import type { RunSummary } from "@/lib/types";

export type RunCatalogSource = "duckdb" | "runs_json";

export interface RunCatalogResponse {
  source: RunCatalogSource;
  runs: RunSummary[];
  latest_stem: string | null;
}

export interface RunCatalogStore {
  loadCatalog(limit?: number): Promise<RunCatalogResponse>;
}
