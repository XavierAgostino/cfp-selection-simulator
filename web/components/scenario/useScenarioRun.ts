"use client";

import * as React from "react";
import type { RunJobRecord } from "@/lib/runJob";
import type { ScenarioWeights } from "@/lib/scenarioWeights";
import { invalidateRunPayloadCache } from "@/lib/runPayloadCache";
import { isDemoMode, PUBLIC_DEMO_SCENARIO_LAUNCH_NOTE } from "@/lib/demoMode";

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

/** Maps a run API error code / HTTP status to a human sentence. */
function launchErrorMessage(status: number, code?: string): string {
  if (status === 409) return "Another run is already in progress. Try again once it finishes.";
  if (status === 429) return "Live runs are throttled. Wait a few minutes and retry.";
  if (status === 501)
    return isDemoMode
      ? PUBLIC_DEMO_SCENARIO_LAUNCH_NOTE
      : "Run generation is unavailable in this deployment. Enable SELECTION_ROOM_ENABLE_RUN_JOBS.";
  if (code === "cfbd_unavailable") return "Live CFBD is not configured on this server.";
  if (code === "invalid_arguments") return "The weights were rejected by the server.";
  return "Could not start the scenario run.";
}

/**
 * Launches a weight scenario through the Option B job path and polls it to
 * completion, exposing phase/logs/stem for the Scenario Lab workspace. Unlike
 * the Run Analysis dialog, success does not navigate away — the caller uses the
 * returned stem to fetch and render a diff in place.
 */
export function useScenarioRun(onSucceeded?: (stem: string) => void) {
  const [state, setState] = React.useState<ScenarioRunState>({
    phase: "idle",
    job: null,
    logLines: [],
    stem: null,
    error: null,
  });
  const [jobId, setJobId] = React.useState<string | null>(null);
  const onSucceededRef = React.useRef(onSucceeded);
  React.useEffect(() => {
    onSucceededRef.current = onSucceeded;
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
      res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
    } catch {
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: "Network error starting the scenario run.",
      }));
      return;
    }

    if (!res.ok) {
      let code: string | undefined;
      try {
        code = ((await res.json()) as { error?: string }).error;
      } catch {
        // no body
      }
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: launchErrorMessage(res.status, code),
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
