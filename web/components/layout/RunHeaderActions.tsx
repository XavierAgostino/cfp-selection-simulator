"use client";

import * as React from "react";

import { RunAnalysisDialog } from "@/components/layout/RunAnalysisDialog";
import { RunSwitcher } from "@/components/layout/RunSwitcher";
import type { RunJobRecord } from "@/lib/runJob";
import { useRunCatalog } from "@/lib/useRunCatalog";
import type { RunSummary, RunsPayload } from "@/lib/types";

interface RunHeaderActionsProps {
  initialRuns: RunsPayload;
  currentRun: RunSummary;
  currentStem: string;
}

export function RunHeaderActions({
  initialRuns,
  currentRun,
  currentStem,
}: RunHeaderActionsProps) {
  const { catalog, refresh: refreshCatalog } = useRunCatalog(initialRuns);
  const [jobs, setJobs] = React.useState<RunJobRecord[]>([]);

  const latestStem = catalog.latest_stem ?? initialRuns.latest.stem;
  const runs = catalog.runs.length > 0 ? catalog.runs : initialRuns.runs;

  const refreshJobs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/run/jobs", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as { jobs: RunJobRecord[] };
        setJobs(payload.jobs ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/run/jobs", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { jobs: RunJobRecord[] } | null) => {
        if (!cancelled && payload) setJobs(payload.jobs ?? []);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onRunCompleted() {
    await Promise.all([refreshCatalog(), refreshJobs()]);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
      {runs.length > 1 ? (
        <RunSwitcher
          runs={runs}
          currentStem={currentStem}
          latestStem={latestStem}
        />
      ) : null}
      <RunAnalysisDialog
        defaultYear={currentRun.season}
        defaultWeek={currentRun.week}
        currentRun={currentRun}
        currentStem={currentStem}
        latestStem={latestStem}
        catalog={catalog}
        jobs={jobs}
        onRefreshCatalog={refreshCatalog}
        onRefreshJobs={refreshJobs}
        onRunCompleted={onRunCompleted}
      />
    </div>
  );
}
