export class HostedConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostedConfigurationError";
  }
}

export type HostedRunErrorCode =
  | "invalid_beta_code"
  | "run_generation_disabled"
  | "run_in_progress"
  | "daily_job_cap_exceeded"
  | "cfbd_unavailable"
  | "live_run_throttled"
  | "executor_not_configured";

export class HostedRunError extends Error {
  readonly code: HostedRunErrorCode;
  readonly disabledReason: string | null;

  constructor(
    message: string,
    code: HostedRunErrorCode,
    disabledReason: string | null = null,
  ) {
    super(message);
    this.name = "HostedRunError";
    this.code = code;
    this.disabledReason = disabledReason;
  }
}
