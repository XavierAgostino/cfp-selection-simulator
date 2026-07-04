import { tasks } from "@trigger.dev/sdk";

import type { JobStore } from "@/lib/runtime/job-store/types";
import type { RunExecutor } from "@/lib/runtime/run-executor/types";
import type { runHostedJob } from "../../../trigger/run-hosted-job";

export class TriggerRunExecutor implements RunExecutor {
  constructor(private readonly jobStore: JobStore) {}

  async enqueueJob(jobId: string): Promise<void> {
    const handle = await tasks.trigger<typeof runHostedJob>("run-hosted-job", {
      jobId,
    });
    if (handle?.id) {
      await this.jobStore.setTriggerRunId(jobId, handle.id);
    }
  }
}

/** Test seam for mocking Trigger.dev enqueue behavior. */
export async function triggerRunHostedJobTask(jobId: string): Promise<string | null> {
  const handle = await tasks.trigger<typeof runHostedJob>("run-hosted-job", { jobId });
  return handle?.id ?? null;
}
