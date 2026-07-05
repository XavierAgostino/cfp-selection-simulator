"use client";

import * as React from "react";
import type { RunCapabilities, RunJobRecord } from "@/lib/runJob";
import type { ScenarioWeights } from "@/lib/scenarioWeights";
import { invalidateRunPayloadCache } from "@/lib/runPayloadCache";
import { buildRunPostInit, formatRunLaunchError } from "@/lib/runApiClient";

export type ScenarioRunPhase =
  | "idle"
  | "launching"
  | "running"
  | "succeeded"
  | "failed";

export interface ScenarioRunLaunch {
  season: number;
  week: number;
  data_source: "sample" | "cfbd";
  weights: ScenarioWeights;
}

export interface ScenarioRunState {
  phase: ScenarioRunPhase;
  job: RunJobRecord | null;
  logLines: string[];
  /** The stem the scenario produced, once it succeeds. */
  stem: string | null;
  error: string | null;
}

const POLL_MS = 2000;

/**
 * Launches a weight scenario through the Option B job path and polls it to
 * completion, exposing phase/logs/stem for the Scenario Lab workspace. Unlike
 * the Run Analysis dialog, success does not navigate away — the caller uses the
 * returned stem to fetch and render a diff in place.
 */
export function useScenarioRun(
  onSucceeded?: (stem: string) => void,
  capabilities?: RunCapabilities | null,
) {
  const [state, setState] = React.useState<ScenarioRunState>({
    phase: "idle",
    job: null,
    logLines: [],
    stem: null,
    error: null,
  });
  const [jobId, setJobId] = React.useState<string | null>(null);
  const onSucceededRef = React.useRef(onSucceeded);
  const capabilitiesRef = React.useRef(capabilities);
  React.useEffect(() => {
    onSucceededRef.current = onSucceeded;
  });
  React.useEffect(() => {
    capabilitiesRef.current = capabilities;
  });

  const running = state.phase === "running" || state.phase === "launching";

  React.useEffect(() => {
    if (!jobId || state.phase !== "running") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`/api/run/${encodeURIComponent(jobId)}`, { cache: "no-store" }),
          fetch(`/api/run/${encodeURIComponent(jobId)}/logs`, { cache: "no-store" }),
        ]);
        if (cancelled || !statusRes.ok) return;

        const next = (await statusRes.json()) as RunJobRecord;
        const logLines = logsRes.ok
          ? ((await logsRes.json()) as { lines: string[] }).lines ?? []
          : [];

        if (next.status === "succeeded" && next.stem) {
          const stem = next.stem;
          invalidateRunPayloadCache(stem);
          setState({ phase: "succeeded", job: next, logLines, stem, error: null });
          setJobId(null);
          onSucceededRef.current?.(stem);
        } else if (next.status === "failed" || next.status === "cancelled") {
          setState({
            phase: "failed",
            job: next,
            logLines,
            stem: null,
            error: next.error ?? "The scenario run failed. Check the log below.",
          });
          setJobId(null);
        } else {
          setState((prev) => ({ ...prev, job: next, logLines }));
        }
      } catch {
        // transient poll failure — keep polling
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, state.phase]);

  const launch = React.useCallback(async (req: ScenarioRunLaunch) => {
    setState({ phase: "launching", job: null, logLines: [], stem: null, error: null });
    let res: Response;
    try {
      res = await fetch("/api/run", buildRunPostInit(req));
    } catch {
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: "Network error starting the scenario run.",
      }));
      return;
    }

    if (!res.ok) {
      const message = await formatRunLaunchError(res, capabilitiesRef.current ?? null);
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: message,
      }));
      return;
    }

    const { job_id } = (await res.json()) as { job_id: string };
    const optimistic: RunJobRecord = {
      job_id,
      status: "queued",
      created_at: new Date().toISOString(),
      started_at: null,
      finished_at: null,
      request: { season: req.season, week: req.week, data_source: req.data_source, weights: req.weights },
      stem: null,
      error: null,
      pid: null,
      exit_code: null,
    };
    setState({ phase: "running", job: optimistic, logLines: [], stem: null, error: null });
    setJobId(job_id);
  }, []);

  const reset = React.useCallback(() => {
    setState({ phase: "idle", job: null, logLines: [], stem: null, error: null });
    setJobId(null);
  }, []);

  return { ...state, running, launch, reset };
}
