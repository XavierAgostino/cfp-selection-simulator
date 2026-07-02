"use client";

import { useEffect, useState } from "react";
import type { TeamAssetsPayload } from "@/lib/types";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TeamAssetsPayload };

let cachedPayload: TeamAssetsPayload | null = null;
let inFlight: Promise<TeamAssetsPayload> | null = null;

function fetchTeamAssets(): Promise<TeamAssetsPayload> {
  if (cachedPayload) return Promise.resolve(cachedPayload);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/data/team-assets.json", { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch team-assets.json: ${res.status}`);
      return res.json() as Promise<TeamAssetsPayload>;
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

/** Client-side hook for team-assets.json, cached across the session. */
export function useTeamAssets(): FetchState {
  const [state, setState] = useState<FetchState>(() =>
    cachedPayload ? { status: "ready", data: cachedPayload } : { status: "loading" },
  );

  useEffect(() => {
    // fetchTeamAssets resolves from the module cache when warm; resolution is
    // always a microtask, so setState never fires synchronously in the effect.
    let cancelled = false;
    fetchTeamAssets()
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
