import { describe, expect, it } from "vitest";

import { buildWorkerSubprocessEnv } from "@/lib/runtime/run-executor/worker-env";

describe("buildWorkerSubprocessEnv", () => {
  it("forwards only worker-required env keys", () => {
    const env = buildWorkerSubprocessEnv({
      CFBD_API_KEY: "secret-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      SELECTION_ROOM_DATABASE_URL: "postgres://example",
      SELECTION_ROOM_BETA_ACCESS_CODE: "beta-should-not-forward",
      TRIGGER_SECRET_KEY: "trigger-should-not-forward",
      PATH: "/usr/bin",
    });

    expect(env.CFBD_API_KEY).toBe("secret-key");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role");
    expect(env.SELECTION_ROOM_DATABASE_URL).toBe("postgres://example");
    expect(env.SELECTION_ROOM_BETA_ACCESS_CODE).toBeUndefined();
    expect(env.TRIGGER_SECRET_KEY).toBeUndefined();
  });
});
