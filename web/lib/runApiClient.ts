import type { HostedRunCapabilities, RunCapabilities } from "@/lib/runJob";

export const BETA_ACCESS_STORAGE_KEY = "selection-room-beta-code";

export function isHostedCapabilities(
  caps: RunCapabilities | null,
): caps is HostedRunCapabilities {
  return caps?.runtime === "hosted";
}

export function getBetaAccessCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(BETA_ACCESS_STORAGE_KEY)?.trim() ?? "";
}

export function setBetaAccessCode(code: string): void {
  if (typeof window === "undefined") return;
  const trimmed = code.trim();
  if (trimmed) {
    sessionStorage.setItem(BETA_ACCESS_STORAGE_KEY, trimmed);
  } else {
    sessionStorage.removeItem(BETA_ACCESS_STORAGE_KEY);
  }
}

export function buildRunPostInit(body: object): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const betaCode = getBetaAccessCode();
  if (betaCode) {
    headers["X-Selection-Room-Beta-Code"] = betaCode;
  }
  return {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  };
}

export function hostedRunDashboardUrl(stem: string): string {
  return `/dashboard?run=${encodeURIComponent(stem)}`;
}

interface RunErrorBody {
  error?: string;
  disabled_reason?: string;
}

export async function formatRunLaunchError(
  res: Response,
  caps: RunCapabilities | null,
): Promise<string> {
  let body: RunErrorBody = {};
  try {
    body = (await res.json()) as RunErrorBody;
  } catch {
    // no body
  }

  const code = body.error;
  const hosted = isHostedCapabilities(caps);

  if (res.status === 401 || code === "invalid_beta_code") {
    return "Invalid beta access code.";
  }
  if (res.status === 409 || code === "run_in_progress") {
    return hosted
      ? "Another hosted run is already in progress."
      : "Another run is already in progress.";
  }
  if (code === "daily_job_cap_exceeded") {
    return "Daily hosted run limit reached. Try again tomorrow.";
  }
  if (res.status === 429 || code === "live_run_throttled") {
    return "Live runs are throttled. Wait a few minutes and retry.";
  }
  if (res.status === 503 || code === "executor_not_configured") {
    return (
      body.disabled_reason ??
      "Hosted run generation is not available on this deployment."
    );
  }
  if (code === "cfbd_unavailable") {
    return "Live CFBD is not configured on this server.";
  }
  if (code === "invalid_arguments") {
    return "The run parameters were rejected by the server.";
  }
  if (res.status === 501 || code === "run_generation_disabled") {
    if (hosted) {
      return (
        body.disabled_reason ??
        caps?.disabled_reason ??
        "Hosted run generation is not available on this deployment."
      );
    }
    return "Run generation is unavailable. Enable SELECTION_ROOM_ENABLE_RUN_JOBS and run make setup.";
  }
  return "Could not start the run.";
}

export function hostedGenerationDisabledMessage(
  caps: HostedRunCapabilities,
): string {
  return (
    caps.disabled_reason ??
    "Hosted run generation is not available on this deployment."
  );
}

export function canLaunchHostedRun(
  caps: HostedRunCapabilities,
  betaCode: string,
  running: boolean,
): boolean {
  if (running) return false;
  if (!caps.hosted_run_generation_available || !caps.run_generation_enabled) {
    return false;
  }
  if (caps.requires_beta_code && !betaCode.trim()) return false;
  if (caps.active_job_id) return false;
  return true;
}

export function canLaunchLocalRun(
  caps: RunCapabilities,
  running: boolean,
): boolean {
  if (running) return false;
  return caps.run_generation_enabled;
}
