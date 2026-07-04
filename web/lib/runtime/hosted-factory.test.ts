import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getJobStore,
  getRunExecutor,
  resetRuntimeAdaptersForTests,
} from "@/lib/runtime";
import { HostedConfigurationError } from "@/lib/runtime/errors";

describe("hosted runtime factory", () => {
  const originalRuntime = process.env.SELECTION_ROOM_RUNTIME;
  const originalDatabaseUrl = process.env.SELECTION_ROOM_DATABASE_URL;

  beforeEach(() => {
    resetRuntimeAdaptersForTests();
  });

  afterEach(() => {
    resetRuntimeAdaptersForTests();
    if (originalRuntime === undefined) {
      delete process.env.SELECTION_ROOM_RUNTIME;
    } else {
      process.env.SELECTION_ROOM_RUNTIME = originalRuntime;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.SELECTION_ROOM_DATABASE_URL;
    } else {
      process.env.SELECTION_ROOM_DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("throws a clear configuration error when hosted DB env is missing", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    delete process.env.SELECTION_ROOM_DATABASE_URL;

    expect(() => getJobStore()).toThrow(HostedConfigurationError);
    expect(() => getJobStore()).toThrow(/SELECTION_ROOM_DATABASE_URL/);
  });

  it("returns TriggerRunExecutor when hosted trigger env is configured", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_DATABASE_URL = "postgres://example";
    process.env.TRIGGER_SECRET_KEY = "tr_dev_test";
    process.env.SELECTION_ROOM_HOSTED_EXECUTOR = "trigger";

    const executor = getRunExecutor();
    expect(executor.constructor.name).toBe("TriggerRunExecutor");
  });

  it("throws when hosted executor env is missing", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_DATABASE_URL = "postgres://example";
    delete process.env.TRIGGER_SECRET_KEY;
    delete process.env.SELECTION_ROOM_HOSTED_EXECUTOR;

    expect(() => getRunExecutor()).toThrow(HostedConfigurationError);
    expect(() => getRunExecutor()).toThrow(/TRIGGER_SECRET_KEY/);
  });
});
