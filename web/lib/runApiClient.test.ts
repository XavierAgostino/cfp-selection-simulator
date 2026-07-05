import { describe, expect, it } from "vitest";

import {
  formatRunLaunchError,
  hostedRunDashboardUrl,
  isHostedCapabilities,
} from "@/lib/runApiClient";
import type { HostedRunCapabilities, LocalRunCapabilities } from "@/lib/runJob";

const localCaps: LocalRunCapabilities = {
  run_generation_enabled: true,
  engine_available: true,
  storage_writable: true,
  live_cfbd_enabled: false,
  active_job_id: null,
  runtime: "persistent_node",
  supports_background_jobs: true,
};

const hostedCaps: HostedRunCapabilities = {
  run_generation_enabled: false,
  engine_available: false,
  storage_writable: true,
  live_cfbd_enabled: false,
  active_job_id: null,
  runtime: "hosted",
  supports_background_jobs: false,
  hosted_run_generation_available: true,
  requires_auth: true,
  authenticated: false,
  daily_jobs_remaining: 3,
  user_daily_jobs_remaining: null,
  artifact_store: "supabase",
  job_store: "postgres",
  executor_configured: false,
  disabled_reason: "Trigger.dev worker is not configured.",
};

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("runApiClient", () => {
  it("detects hosted capabilities", () => {
    expect(isHostedCapabilities(hostedCaps)).toBe(true);
    expect(isHostedCapabilities(localCaps)).toBe(false);
    expect(isHostedCapabilities(null)).toBe(false);
  });

  it("maps auth required to a sign-in message", async () => {
    const message = await formatRunLaunchError(
      jsonResponse(401, { error: "auth_required" }),
      hostedCaps,
    );
    expect(message).toContain("Sign in with GitHub");
  });

  it("maps the per-user daily cap to a clear message", async () => {
    const message = await formatRunLaunchError(
      jsonResponse(429, { error: "user_daily_cap_exceeded" }),
      hostedCaps,
    );
    expect(message).toContain("daily run limit");
  });

  it("maps executor unavailable for hosted mode", async () => {
    const message = await formatRunLaunchError(
      jsonResponse(503, {
        error: "executor_not_configured",
        disabled_reason: "Worker pending",
      }),
      hostedCaps,
    );
    expect(message).toBe("Worker pending");
  });

  it("maps daily cap for hosted mode", async () => {
    const message = await formatRunLaunchError(
      jsonResponse(429, { error: "daily_job_cap_exceeded" }),
      hostedCaps,
    );
    expect(message).toContain("Daily hosted run limit");
  });

  it("builds dashboard completion URLs", () => {
    expect(hostedRunDashboardUrl("2025_week15")).toBe("/dashboard?run=2025_week15");
  });
});
