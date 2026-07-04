import type { RunCatalogStore } from "@/lib/runtime/run-catalog-store/types";
import {
  runCatalogRowToSummary,
  type CreateRunRecord,
  type RunCatalogRow,
} from "@/lib/runtime/run-catalog-store/mappers";
import { getPostgresClient } from "@/lib/runtime/db/postgres";
import type { RunCatalogResponse } from "@/lib/runtime/run-catalog-store/types";
import type { RunSummary } from "@/lib/types";

export class PostgresRunCatalogStore implements RunCatalogStore {
  private readonly sql: ReturnType<typeof getPostgresClient>;

  constructor(databaseUrl: string) {
    this.sql = getPostgresClient(databaseUrl);
  }

  async loadCatalog(limit = 100): Promise<RunCatalogResponse> {
    const rows = await this.sql<RunCatalogRow[]>`
      SELECT
        stem, season, week, source, ruleset, scenario_id, label,
        config_hash, artifact_base_url, manifest_json, created_at
      FROM runs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const runs = rows.map(runCatalogRowToSummary);
    return {
      source: "postgres",
      runs,
      latest_stem: runs[0]?.stem ?? null,
    };
  }

  async createRun(record: CreateRunRecord): Promise<void> {
    await this.sql`
      INSERT INTO runs (
        stem, season, week, source, ruleset, scenario_id, label,
        config_hash, artifact_base_url, manifest_json
      ) VALUES (
        ${record.stem}, ${record.season}, ${record.week}, ${record.source},
        ${record.ruleset ?? null}, ${record.scenario_id ?? "base"},
        ${record.label ?? null}, ${record.config_hash ?? null},
        ${record.artifact_base_url},
        ${
          record.manifest_json
            ? this.sql.json(JSON.parse(JSON.stringify(record.manifest_json)))
            : null
        }
      )
      ON CONFLICT (stem) DO UPDATE SET
        season = EXCLUDED.season,
        week = EXCLUDED.week,
        source = EXCLUDED.source,
        ruleset = EXCLUDED.ruleset,
        scenario_id = EXCLUDED.scenario_id,
        label = EXCLUDED.label,
        config_hash = EXCLUDED.config_hash,
        artifact_base_url = EXCLUDED.artifact_base_url,
        manifest_json = EXCLUDED.manifest_json
    `;
  }

  async getRun(stem: string): Promise<RunSummary | null> {
    const rows = await this.sql<RunCatalogRow[]>`
      SELECT
        stem, season, week, source, ruleset, scenario_id, label,
        config_hash, artifact_base_url, manifest_json, created_at
      FROM runs
      WHERE stem = ${stem}
      LIMIT 1
    `;
    return rows[0] ? runCatalogRowToSummary(rows[0]) : null;
  }
}
