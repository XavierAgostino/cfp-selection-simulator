"use client";

import { useEffect, useState } from "react";
import type { RankingsPayload } from "@/lib/types";
import {
  rankingsCache,
  rankingsInFlight,
  runCacheKey,
} from "@/lib/runPayloadCache";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: RankingsPayload };

function rankingsPath(stem: string | null): string {
  return stem
    ? `/api/data/runs/${encodeURIComponent(stem)}/rankings.json`
    : "/api/data/rankings.json";
}

function fetchRankings(stem: string | null): Promise<RankingsPayload> {
  const key = runCacheKey(stem);
  const cached = rankingsCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = rankingsInFlight.get(key);
  if (pending) return pending;

  const request = fetch(rankingsPath(stem), { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch rankings.json: ${res.status}`);
      return res.json() as Promise<RankingsPayload>;
    })
    .then((data) => {
      rankingsCache.set(key, data);
      rankingsInFlight.delete(key);
      return data;
    })
    .catch((err) => {
      rankingsInFlight.delete(key);
      throw err;
    });
  rankingsInFlight.set(key, request);
  return request;
}

function initialState(key: string): FetchState {
  const cached = rankingsCache.get(key);
  return cached ? { status: "ready", data: cached } : { status: "loading" };
}

export function useRankings(stem: string | null = null): FetchState {
  const key = runCacheKey(stem);
  const [state, setState] = useState<FetchState>(() => initialState(key));
  const [renderedKey, setRenderedKey] = useState(key);

  if (renderedKey !== key) {
    setRenderedKey(key);
    setState(initialState(key));
  }

  useEffect(() => {
    let cancelled = false;
    fetchRankings(stem)
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
