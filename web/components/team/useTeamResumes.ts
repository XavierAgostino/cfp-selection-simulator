"use client";

import { useEffect, useState } from "react";
import type { TeamResumesPayload } from "@/lib/types";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TeamResumesPayload };

/**
 * Module-level cache for team-resumes.json, keyed by run stem (null = the
 * latest run's flat copy). The drawer, hover cards, and the team page all
 * hit the network at most once per run per page load; repeated opens
 * resolve instantly from memory. This is the "preload once, never fetch
 * per hover" backbone of the explainability layer.
 */
const cachedPayloads = new Map<string, TeamResumesPayload>();
const inFlight = new Map<string, Promise<TeamResumesPayload>>();

function cacheKey(stem: string | null): string {
  return stem ?? "__latest__";
}

function resumePath(stem: string | null): string {
  return stem
    ? `/api/data/runs/${encodeURIComponent(stem)}/team-resumes.json`
    : "/api/data/team-resumes.json";
}

function fetchTeamResumes(stem: string | null): Promise<TeamResumesPayload> {
  const key = cacheKey(stem);
  const cached = cachedPayloads.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetch(resumePath(stem), { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch team-resumes.json: ${res.status}`);
      return res.json() as Promise<TeamResumesPayload>;
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

/**
 * Client-side hook for reading team-resumes.json for a specific run,
 * cached across the session. Pass the active run stem (from useActiveRun)
 * or null for the latest run.
 */
function initialState(key: string): FetchState {
  const cached = cachedPayloads.get(key);
  return cached ? { status: "ready", data: cached } : { status: "loading" };
}

export function useTeamResumes(stem: string | null = null): FetchState {
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
    // fetchTeamResumes resolves from the module cache when warm; resolution is
    // always a microtask, so setState never fires synchronously in the effect.
    let cancelled = false;
    fetchTeamResumes(stem)
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
