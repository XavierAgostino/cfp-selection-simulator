import type { JobStore } from "@/lib/runtime/job-store/types";
import {
  appendLogToText,
  readLogTailFromText,
  resolveStemFromLogsText,
  runJobRecordToRow,
  runJobRowToRecord,
  type RunJobRow,
} from "@/lib/runtime/job-store/mappers";
import { getPostgresClient } from "@/lib/runtime/db/postgres";
import {
  hostedDailyJobCap,
  hostedMaxConcurrentJobs,
  liveRunThrottleMinutes,
} from "@/lib/runtime/config";
import { redactLogLine } from "@/lib/runtime/log-redaction";
import type { RunJobRecord } from "@/lib/runJob";
import { BASE_SCENARIO_ID, weightsScenarioId } from "@/lib/scenarioWeights";

const LOG_TAIL_LINES = 200;

export class PostgresJobStore implements JobStore {
  private readonly sql: ReturnType<typeof getPostgresClient>;

  constructor(databaseUrl: string) {
    this.sql = getPostgresClient(databaseUrl);
  }

  async createJob(job: RunJobRecord): Promise<void> {
    const row = runJobRecordToRow(job);
    await this.sql`
      INSERT INTO run_jobs (
        id, status, requested_season, requested_week, requested_source,
        requested_ruleset, scenario_weights_json, run_stem, artifact_base_url,
        error_message, logs_text, pid, exit_code, trigger_run_id,
        created_at, started_at, finished_at
      ) VALUES (
        ${row.id}, ${row.status}, ${row.requested_season}, ${row.requested_week},
        ${row.requested_source}, ${row.requested_ruleset},
        ${row.scenario_weights_json ? this.sql.json({ ...row.scenario_weights_json }) : null},
        ${row.run_stem}, ${row.artifact_base_url}, ${row.error_message},
        ${row.logs_text}, ${row.pid}, ${row.exit_code}, ${row.trigger_run_id},
        ${row.created_at}, ${row.started_at}, ${row.finished_at}
      )
    `;
  }

  async getJob(jobId: string): Promise<RunJobRecord | null> {
    const rows = await this.sql<RunJobRow[]>`
      SELECT * FROM run_jobs WHERE id = ${jobId} LIMIT 1
    `;
    const row = rows[0];
    return row ? runJobRowToRecord(row) : null;
  }

  async updateJob(job: RunJobRecord): Promise<void> {
    const row = runJobRecordToRow(job);
    await this.sql`
      UPDATE run_jobs SET
        status = ${row.status},
        run_stem = ${row.run_stem},
        artifact_base_url = ${row.artifact_base_url},
        error_message = ${row.error_message},
        pid = ${row.pid},
        exit_code = ${row.exit_code},
        started_at = ${row.started_at},
        finished_at = ${row.finished_at},
        scenario_weights_json = ${
          row.scenario_weights_json ? this.sql.json({ ...row.scenario_weights_json }) : null
        }
      WHERE id = ${row.id}
    `;
  }

  async listRecentJobs(limit = 20): Promise<RunJobRecord[]> {
    const rows = await this.sql<RunJobRow[]>`
      SELECT * FROM run_jobs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(runJobRowToRecord);
  }

  async getActiveJob(): Promise<RunJobRecord | null> {
    const rows = await this.sql<RunJobRow[]>`
      SELECT * FROM run_jobs
      WHERE status IN ('queued', 'running')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] ? runJobRowToRecord(rows[0]) : null;
  }

  async setActivePointer(jobId: string, pid: number | null): Promise<void> {
    void jobId;
    void pid;
    // Hosted jobs track active state via status column, not a pointer file.
  }

  async clearActivePointer(): Promise<void> {
    // No-op for Postgres-backed jobs.
  }

  async readLogTail(jobId: string, maxLines = LOG_TAIL_LINES): Promise<string[]> {
    const rows = await this.sql<{ logs_text: string }[]>`
      SELECT logs_text FROM run_jobs WHERE id = ${jobId} LIMIT 1
    `;
    const logsText = rows[0]?.logs_text ?? "";
    return readLogTailFromText(logsText, maxLines);
  }

  async appendLog(jobId: string, line: string): Promise<void> {
    const safe = redactLogLine(line);
    if (!safe.trim()) return;

    const rows = await this.sql<{ logs_text: string }[]>`
      SELECT logs_text FROM run_jobs WHERE id = ${jobId} LIMIT 1
    `;
    const current = rows[0]?.logs_text ?? "";
    const next = appendLogToText(current, safe);
    await this.sql`
      UPDATE run_jobs SET logs_text = ${next} WHERE id = ${jobId}
    `;
  }

  async isStorageWritable(): Promise<boolean> {
    try {
      await this.sql`SELECT 1 AS ok`;
      return true;
    } catch {
      return false;
    }
  }

  async assertNoActiveJob(): Promise<void> {
    await this.assertCanStartJob();
  }

  async assertCanStartJob(): Promise<void> {
    const maxConcurrent = hostedMaxConcurrentJobs();
    const activeCountRows = await this.sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM run_jobs
      WHERE status IN ('queued', 'running')
    `;
    const activeCount = Number.parseInt(activeCountRows[0]?.count ?? "0", 10);
    if (activeCount >= maxConcurrent) {
      throw new Error("run_in_progress");
    }

    const dailyCap = hostedDailyJobCap();
    const dailyCountRows = await this.sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM run_jobs
      WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    `;
    const dailyCount = Number.parseInt(dailyCountRows[0]?.count ?? "0", 10);
    if (dailyCount >= dailyCap) {
      throw new Error("daily_job_cap_exceeded");
    }
  }

  async assertLiveThrottleAllowed(): Promise<void> {
    const minutes = liveRunThrottleMinutes();
    if (minutes === 0) return;

    const rows = await this.sql<{ created_at: Date }[]>`
      SELECT created_at FROM run_jobs
      WHERE requested_source = 'cfbd'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastRun = rows[0]?.created_at;
    if (!lastRun) return;

    const elapsedMs = Date.now() - new Date(lastRun).getTime();
    if (elapsedMs < minutes * 60 * 1000) {
      throw new Error("live_run_throttled");
    }
  }

  async recordLiveRunStarted(): Promise<void> {
    // Throttle reads from run_jobs.created_at for CFBD jobs.
  }

  async resolveStemFromJobLog(jobId: string): Promise<string | null> {
    const rows = await this.sql<{ logs_text: string }[]>`
      SELECT logs_text FROM run_jobs WHERE id = ${jobId} LIMIT 1
    `;
    return resolveStemFromLogsText(rows[0]?.logs_text ?? "");
  }

  async resolveStemFromRunsJson(job: RunJobRecord): Promise<string | null> {
    if (job.stem) return job.stem;

    const runId = `${job.request.season}_week${job.request.week}`;
    const startedAt = job.started_at ?? job.created_at;
    const expectedScenarioId = job.request.weights
      ? weightsScenarioId(job.request.weights)
      : BASE_SCENARIO_ID;

    const rows = await this.sql<
      { stem: string; scenario_id: string; source: string; created_at: Date }[]
    >`
      SELECT stem, scenario_id, source, created_at FROM runs
      WHERE season = ${job.request.season}
        AND week = ${job.request.week}
        AND scenario_id = ${expectedScenarioId}
        AND source = ${job.request.data_source}
        AND created_at >= ${startedAt}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (rows[0]?.stem) return rows[0].stem;

    const latestRows = await this.sql<{ stem: string }[]>`
      SELECT stem FROM runs ORDER BY created_at DESC LIMIT 1
    `;
    if (latestRows[0]?.stem) {
      await this.appendLog(
        job.job_id,
        `Warning: no exact runs match for ${runId}; falling back to latest stem ${latestRows[0].stem}`,
      );
      return latestRows[0].stem;
    }

    return null;
  }

  async getDailyJobsRemaining(): Promise<number | null> {
    const dailyCap = hostedDailyJobCap();
    const dailyCountRows = await this.sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM run_jobs
      WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    `;
    const dailyCount = Number.parseInt(dailyCountRows[0]?.count ?? "0", 10);
    return Math.max(0, dailyCap - dailyCount);
  }
}
