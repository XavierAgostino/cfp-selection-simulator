import { afterEach, describe, expect, it } from "vitest";

import { getArtifactStore, resetRuntimeAdaptersForTests } from "@/lib/runtime";
import { HostedConfigurationError } from "@/lib/runtime/errors";

describe("supabase artifact store guard", () => {
  const previous = process.env.SELECTION_ROOM_ARTIFACT_STORE;

  afterEach(() => {
    resetRuntimeAdaptersForTests();
    if (previous === undefined) {
      delete process.env.SELECTION_ROOM_ARTIFACT_STORE;
    } else {
      process.env.SELECTION_ROOM_ARTIFACT_STORE = previous;
    }
  });

  it("rejects supabase artifact store before H3", () => {
    resetRuntimeAdaptersForTests();
    process.env.SELECTION_ROOM_ARTIFACT_STORE = "supabase";
    expect(() => getArtifactStore()).toThrow(HostedConfigurationError);
    expect(() => getArtifactStore()).toThrow(/H3/);
  });
});
