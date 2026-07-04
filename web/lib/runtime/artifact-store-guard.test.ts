import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getArtifactStore, resetRuntimeAdaptersForTests } from "@/lib/runtime";
import { SupabaseArtifactStore } from "@/lib/runtime/artifact-store/supabase";
import { HostedConfigurationError } from "@/lib/runtime/errors";

describe("supabase artifact store factory", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    resetRuntimeAdaptersForTests();
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
    resetRuntimeAdaptersForTests();
  });

  it("requires hosted runtime for supabase artifact store", () => {
    process.env.SELECTION_ROOM_ARTIFACT_STORE = "supabase";
    delete process.env.SELECTION_ROOM_RUNTIME;

    expect(() => getArtifactStore()).toThrow(HostedConfigurationError);
    expect(() => getArtifactStore()).toThrow(/SELECTION_ROOM_RUNTIME=hosted/);
  });

  it("returns clear configuration error when storage env is missing", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_ARTIFACT_STORE = "supabase";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getArtifactStore()).toThrow(HostedConfigurationError);
    expect(() => getArtifactStore()).toThrow(/SUPABASE_URL/);
    expect(() => getArtifactStore()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("selects SupabaseArtifactStore when hosted supabase env is present", () => {
    process.env.SELECTION_ROOM_RUNTIME = "hosted";
    process.env.SELECTION_ROOM_ARTIFACT_STORE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SUPABASE_STORAGE_BUCKET = "artifacts";

    const store = getArtifactStore();
    expect(store).toBeInstanceOf(SupabaseArtifactStore);
  });
});
