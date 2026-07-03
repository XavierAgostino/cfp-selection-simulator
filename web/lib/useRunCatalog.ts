"use client";

import * as React from "react";

import type { RunCatalogResponse } from "@/lib/runCatalog";
import type { RunsPayload } from "@/lib/types";

export function runsPayloadToCatalog(payload: RunsPayload): RunCatalogResponse {
  return {
    source: "runs_json",
    runs: payload.runs,
    latest_stem: payload.latest.stem,
  };
}

/** Shared run catalog — one fetch for switcher + Run Analysis modal. */
export function useRunCatalog(initial: RunsPayload) {
  const [catalog, setCatalog] = React.useState<RunCatalogResponse>(() =>
    runsPayloadToCatalog(initial),
  );
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/runs/catalog", { cache: "no-store" });
      if (res.ok) {
        const next = (await res.json()) as RunCatalogResponse;
        setCatalog(next);
      }
    } catch {
      // keep last good catalog
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/runs/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((next: RunCatalogResponse | null) => {
        if (!cancelled && next) setCatalog(next);
      })
      .catch(() => {
        // keep SSR initial catalog
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading, refresh };
}
