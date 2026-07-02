"use client";

import { useEffect, useState } from "react";
import type { TeamResumesPayload } from "@/lib/types";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TeamResumesPayload };

/**
 * Module-level cache for team-resumes.json so the drawer and the team page
 * both hit the network at most once per page load, and repeated drawer
 * opens (browsing rank to rank) resolve instantly from memory.
 */
let cachedPayload: TeamResumesPayload | null = null;
let inFlight: Promise<TeamResumesPayload> | null = null;

function fetchTeamResumes(): Promise<TeamResumesPayload> {
  if (cachedPayload) return Promise.resolve(cachedPayload);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/data/team-resumes.json", { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch team-resumes.json: ${res.status}`);
      return res.json() as Promise<TeamResumesPayload>;
    })
    .then((data) => {
      cachedPayload = data;
      inFlight = null;
      return data;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });
  return inFlight;
}

/** Client-side hook for reading team-resumes.json, cached across the session. */
export function useTeamResumes(): FetchState {
  const [state, setState] = useState<FetchState>(() =>
    cachedPayload ? { status: "ready", data: cachedPayload } : { status: "loading" },
  );

  useEffect(() => {
    // fetchTeamResumes resolves from the module cache when warm; resolution is
    // always a microtask, so setState never fires synchronously in the effect.
    let cancelled = false;
    fetchTeamResumes()
      .then((data) => {
        if (!cancelled) {
          setState((prev) => (prev.status === "ready" ? prev : { status: "ready", data }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState((prev) => (prev.status === "ready" ? prev : { status: "error" }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
