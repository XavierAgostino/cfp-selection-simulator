"use client";

import { useEffect, useState } from "react";
import type { SensitivityPayload } from "@/lib/types";
import {
  runCacheKey,
  sensitivityCache,
  sensitivityInFlight,
} from "@/lib/runPayloadCache";

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: SensitivityPayload };

function sensitivityPath(stem: string | null): string {
  return stem
    ? `/api/data/runs/${encodeURIComponent(stem)}/sensitivity.json`
    : "/api/data/sensitivity.json";
}

function fetchSensitivity(stem: string | null): Promise<SensitivityPayload> {
  const key = runCacheKey(stem);
  const cached = sensitivityCache.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = sensitivityInFlight.get(key);
  if (pending) return pending;

  const request = fetch(sensitivityPath(stem), { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch sensitivity.json: ${res.status}`);
      }
      return res.json() as Promise<SensitivityPayload>;
    })
    .then((data) => {
      sensitivityCache.set(key, data);
      sensitivityInFlight.delete(key);
      return data;
    })
    .catch((err) => {
      sensitivityInFlight.delete(key);
      throw err;
    });
  sensitivityInFlight.set(key, request);
  return request;
}

function initialState(key: string): FetchState {
  const cached = sensitivityCache.get(key);
  return cached ? { status: "ready", data: cached } : { status: "loading" };
}

export function useSensitivity(stem: string | null = null): FetchState {
  const key = runCacheKey(stem);
  const [state, setState] = useState<FetchState>(() => initialState(key));
  const [renderedKey, setRenderedKey] = useState(key);

  if (renderedKey !== key) {
    setRenderedKey(key);
    setState(initialState(key));
  }

  useEffect(() => {
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
