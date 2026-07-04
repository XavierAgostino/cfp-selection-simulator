import type {
  DataSource,
  JobStatus,
  RunJobRecord,
  RunJobRequest,
} from "@/lib/runJob";

export interface JobStore {
  createJob(job: RunJobRecord): Promise<void>;
  getJob(jobId: string): Promise<RunJobRecord | null>;
  updateJob(job: RunJobRecord): Promise<void>;
  listRecentJobs(limit?: number): Promise<RunJobRecord[]>;
  getActiveJob(): Promise<RunJobRecord | null>;
  setActivePointer(jobId: string, pid: number | null): Promise<void>;
  clearActivePointer(): Promise<void>;
  readLogTail(jobId: string, maxLines?: number): Promise<string[]>;
  appendLog(jobId: string, line: string): Promise<void>;
  isStorageWritable(): Promise<boolean>;
  assertCanStartJob(): Promise<void>;
  assertNoActiveJob(): Promise<void>;
  assertLiveThrottleAllowed(): Promise<void>;
  recordLiveRunStarted(): Promise<void>;
  resolveStemFromRunsJson(job: RunJobRecord): Promise<string | null>;
  resolveStemFromJobLog(jobId: string): Promise<string | null>;
  getDailyJobsRemaining(): Promise<number | null>;
  setTriggerRunId(jobId: string, triggerRunId: string): Promise<void>;
}

export type { DataSource, JobStatus, RunJobRecord, RunJobRequest };
