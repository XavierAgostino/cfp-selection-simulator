export interface RunExecutor {
  enqueueJob(jobId: string): Promise<void>;
}
