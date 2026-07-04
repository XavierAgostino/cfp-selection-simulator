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
    expect(() => getJobStore()).toThrow(/H3/);
  });

  it("throws a clear error for hosted run execution before H5", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_DATABASE_URL = "postgres://example";

    expect(() => getRunExecutor()).toThrow(HostedConfigurationError);
    expect(() => getRunExecutor()).toThrow(/H5/);
  });
});
