"use client";

import { useEffect, useState } from "react";
import type { SensitivityPayload } from "@/lib/types";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: SensitivityPayload };

/**
 * Module-level cache for sensitivity.json, keyed by run stem (null = the
 * latest run's flat copy) — same preload-once pattern as useTeamResumes.
 * Runs without Selection Stability data 404 and land in "error"; callers
 * render nothing in that case (no proxy content).
 */
const cachedPayloads = new Map<string, SensitivityPayload>();
const inFlight = new Map<string, Promise<SensitivityPayload>>();

function cacheKey(stem: string | null): string {
  return stem ?? "__latest__";
}

function sensitivityPath(stem: string | null): string {
  return stem
    ? `/api/data/runs/${encodeURIComponent(stem)}/sensitivity.json`
    : "/api/data/sensitivity.json";
}

function fetchSensitivity(stem: string | null): Promise<SensitivityPayload> {
  const key = cacheKey(stem);
  const cached = cachedPayloads.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetch(sensitivityPath(stem), { cache: "force-cache" })
    .then((res) => {
      if (!res.ok)
        throw new Error(`Failed to fetch sensitivity.json: ${res.status}`);
      return res.json() as Promise<SensitivityPayload>;
    })
    .then((data) => {
      cachedPayloads.set(key, data);
      inFlight.delete(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });
  inFlight.set(key, request);
  return request;
}

function initialState(key: string): FetchState {
  const cached = cachedPayloads.get(key);
  return cached ? { status: "ready", data: cached } : { status: "loading" };
}

/**
 * Client-side hook for reading sensitivity.json for a specific run, cached
 * across the session. Pass the active run stem (from useActiveRun) or null
 * for the latest run.
 */
export function useSensitivity(stem: string | null = null): FetchState {
  const key = cacheKey(stem);
  const [state, setState] = useState<FetchState>(() => initialState(key));
  const [renderedKey, setRenderedKey] = useState(key);

  // Adjust-state-during-render: when the active run changes, reset to that
  // run's cached payload (or loading) without an extra effect pass.
  if (renderedKey !== key) {
    setRenderedKey(key);
    setState(initialState(key));
  }

  useEffect(() => {
    // fetchSensitivity resolves from the module cache when warm; resolution is
    // always a microtask, so setState never fires synchronously in the effect.
    let cancelled = false;
    fetchSensitivity(stem)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
