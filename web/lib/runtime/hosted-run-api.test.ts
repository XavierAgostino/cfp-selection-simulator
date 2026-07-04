import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as runtime from "@/lib/runtime";
import { HostedRunError } from "@/lib/runtime/errors";
import type { JobStore } from "@/lib/runtime/job-store/types";
import {
  getCapabilities,
  mapHostedRunError,
  validateHostedRun,
  type RunJobRequest,
} from "@/lib/runJob";

const sampleRequest: RunJobRequest = {
  season: 2024,
  week: 14,
  data_source: "sample",
};

function createMockJobStore(overrides: Partial<JobStore> = {}): JobStore {
  return {
    createJob: vi.fn(),
    getJob: vi.fn(),
    updateJob: vi.fn(),
    listRecentJobs: vi.fn(),
    getActiveJob: vi.fn().mockResolvedValue(null),
    setActivePointer: vi.fn(),
    clearActivePointer: vi.fn(),
    readLogTail: vi.fn(),
    appendLog: vi.fn(),
    isStorageWritable: vi.fn().mockResolvedValue(true),
    assertNoActiveJob: vi.fn(),
    assertCanStartJob: vi.fn().mockResolvedValue(undefined),
    assertLiveThrottleAllowed: vi.fn().mockResolvedValue(undefined),
    recordLiveRunStarted: vi.fn(),
    resolveStemFromRunsJson: vi.fn(),
    resolveStemFromJobLog: vi.fn(),
    getDailyJobsRemaining: vi.fn().mockResolvedValue(4),
    setTriggerRunId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("hosted run API (H4)", () => {
  const envKeys = [
    "SELECTION_ROOM_RUNTIME",
    "SELECTION_ROOM_DATABASE_URL",
    "SELECTION_ROOM_BETA_ACCESS_CODE",
    "SELECTION_ROOM_BETA_RUN_CODES",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SELECTION_ROOM_ARTIFACT_STORE",
    "TRIGGER_SECRET_KEY",
    "SELECTION_ROOM_HOSTED_EXECUTOR",
    "CFBD_API_KEY",
    "SELECTION_ROOM_ENABLE_RUN_JOBS",
  ] as const;

  const originalEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> =
    {};

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }
    runtime.resetRuntimeAdaptersForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    runtime.resetRuntimeAdaptersForTests();
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  function configureHostedInfra(): void {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_DATABASE_URL = "postgres://example";
    process.env.SELECTION_ROOM_BETA_ACCESS_CODE = "beta-secret";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SELECTION_ROOM_ARTIFACT_STORE = "supabase";
  }

  it("returns local capabilities unchanged when not in hosted mode", async () => {
    delete process.env.SELECTION_ROOM_RUNTIME;
    process.env.SELECTION_ROOM_ENABLE_RUN_JOBS = "1";

    const caps = await getCapabilities();
    expect(caps.runtime).toBe("persistent_node");
    expect(caps).not.toHaveProperty("requires_beta_code");
    expect(caps).not.toHaveProperty("hosted_run_generation_available");
  });

  it("returns hosted capabilities with beta required and executor pending", async () => {
    configureHostedInfra();
    vi.spyOn(runtime, "getJobStore").mockReturnValue(createMockJobStore());

    const caps = await getCapabilities();
    if (caps.runtime !== "hosted") {
      throw new Error("expected hosted capabilities");
    }

    expect(caps.runtime).toBe("hosted");
    expect(caps.requires_beta_code).toBe(true);
    expect(caps.hosted_run_generation_available).toBe(true);
    expect(caps.executor_configured).toBe(false);
    expect(caps.run_generation_enabled).toBe(false);
    expect(caps.job_store).toBe("postgres");
    expect(caps.artifact_store).toBe("supabase");
    expect(caps.disabled_reason).toMatch(/TRIGGER_SECRET_KEY/);
    expect(JSON.stringify(caps)).not.toContain("beta-secret");
  });

  it("maps invalid beta code to 401", async () => {
    configureHostedInfra();
    vi.spyOn(runtime, "getJobStore").mockReturnValue(createMockJobStore());

    await expect(validateHostedRun(sampleRequest, null)).rejects.toMatchObject({
      code: "invalid_beta_code",
    });

    const mapped = mapHostedRunError(
      new HostedRunError("missing", "invalid_beta_code"),
    );
    expect(mapped.status).toBe(401);
    expect(mapped.body.error).toBe("invalid_beta_code");
  });

  it("maps active job conflict to 409", async () => {
    configureHostedInfra();
    vi.spyOn(runtime, "getJobStore").mockReturnValue(
      createMockJobStore({
        assertCanStartJob: vi.fn().mockRejectedValue(new Error("run_in_progress")),
      }),
    );

    await expect(
      validateHostedRun(sampleRequest, "beta-secret"),
    ).rejects.toMatchObject({ code: "run_in_progress" });

    const mapped = mapHostedRunError(
      new HostedRunError("busy", "run_in_progress"),
    );
    expect(mapped.status).toBe(409);
  });

  it("maps daily cap to 429", async () => {
    configureHostedInfra();
    vi.spyOn(runtime, "getJobStore").mockReturnValue(
      createMockJobStore({
        assertCanStartJob: vi
          .fn()
          .mockRejectedValue(new Error("daily_job_cap_exceeded")),
      }),
    );

    await expect(
      validateHostedRun(sampleRequest, "beta-secret"),
    ).rejects.toMatchObject({ code: "daily_job_cap_exceeded" });

    const mapped = mapHostedRunError(
      new HostedRunError("cap", "daily_job_cap_exceeded"),
    );
    expect(mapped.status).toBe(429);
  });

  it("maps missing executor to 503 after gates pass", async () => {
    configureHostedInfra();
    vi.spyOn(runtime, "getJobStore").mockReturnValue(createMockJobStore());

    await expect(
      validateHostedRun(sampleRequest, "beta-secret"),
    ).rejects.toMatchObject({ code: "executor_not_configured" });

    const mapped = mapHostedRunError(
      new HostedRunError("pending", "executor_not_configured", "Trigger.dev worker pending"),
    );
    expect(mapped.status).toBe(503);
    expect(mapped.body.error).toBe("executor_not_configured");
    expect(mapped.body.disabled_reason).toMatch(/Trigger/);
  });
});
