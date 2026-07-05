import { describe, expect, it, vi } from "vitest";

import { TriggerRunExecutor } from "@/lib/runtime/run-executor/trigger";
import type { JobStore } from "@/lib/runtime/job-store/types";

const triggerMock = vi.hoisted(() => ({
  trigger: vi.fn(async () => ({ id: "tr_run_123" })),
}));

vi.mock("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: triggerMock.trigger,
  },
}));

function createMockJobStore(): JobStore {
  return {
    createJob: vi.fn(),
    getJob: vi.fn(),
    updateJob: vi.fn(),
    listRecentJobs: vi.fn(),
    getActiveJob: vi.fn(),
    setActivePointer: vi.fn(),
    clearActivePointer: vi.fn(),
    readLogTail: vi.fn(),
    appendLog: vi.fn(),
    isStorageWritable: vi.fn(),
    assertNoActiveJob: vi.fn(),
    assertCanStartJob: vi.fn(),
    assertLiveThrottleAllowed: vi.fn(),
    recordLiveRunStarted: vi.fn(),
    resolveStemFromRunsJson: vi.fn(),
    resolveStemFromJobLog: vi.fn(),
    getDailyJobsRemaining: vi.fn(),
    countUserJobsToday: vi.fn(),
    setTriggerRunId: vi.fn(),
  };
}

describe("TriggerRunExecutor", () => {
  it("enqueues run-hosted-job with jobId and stores trigger run id", async () => {
    const jobStore = createMockJobStore();
    const executor = new TriggerRunExecutor(jobStore);

    await executor.enqueueJob("run_20250704_abc123");

    expect(triggerMock.trigger).toHaveBeenCalledWith("run-hosted-job", {
      jobId: "run_20250704_abc123",
    });
    expect(jobStore.setTriggerRunId).toHaveBeenCalledWith(
      "run_20250704_abc123",
      "tr_run_123",
    );
  });
});
