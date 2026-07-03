"use client";

import { useEffect, useState } from "react";
import type { TeamResumesPayload } from "@/lib/types";
import {
  runCacheKey,
  teamResumesCache,
  teamResumesInFlight,
} from "@/lib/runPayloadCache";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TeamResumesPayload };

function resumePath(stem: string | null): string {
  return stem
    ? `/api/data/runs/${encodeURIComponent(stem)}/team-resumes.json`
    : "/api/data/team-resumes.json";
}

function fetchTeamResumes(stem: string | null): Promise<TeamResumesPayload> {
  const key = runCacheKey(stem);
  const cached = teamResumesCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = teamResumesInFlight.get(key);
  if (pending) return pending;

  const request = fetch(resumePath(stem), { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch team-resumes.json: ${res.status}`);
      return res.json() as Promise<TeamResumesPayload>;
    })
    .then((data) => {
      teamResumesCache.set(key, data);
      teamResumesInFlight.delete(key);
      return data;
    })
    .catch((err) => {
      teamResumesInFlight.delete(key);
      throw err;
    });
  teamResumesInFlight.set(key, request);
  return request;
}

function initialState(key: string): FetchState {
  const cached = teamResumesCache.get(key);
  return cached ? { status: "ready", data: cached } : { status: "loading" };
}

export function useTeamResumes(stem: string | null = null): FetchState {
  const key = runCacheKey(stem);
  const [state, setState] = useState<FetchState>(() => initialState(key));
  const [renderedKey, setRenderedKey] = useState(key);

  if (renderedKey !== key) {
    setRenderedKey(key);
    setState(initialState(key));
  }

  useEffect(() => {
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
