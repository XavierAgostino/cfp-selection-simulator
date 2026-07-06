import { ChevronDown, Info, TriangleAlert } from "lucide-react";

import { RunHeaderActions } from "@/components/layout/RunHeaderActions";
import { RunFreshness } from "@/components/layout/RunFreshness";
import { RunSourceBadge } from "@/components/layout/RunSourceBadge";
import { RunSwitcher } from "@/components/layout/RunSwitcher";
import { getRuns, NotFoundError } from "@/lib/data";
import {
  formatWeightsLabeled,
  runConfigLabel,
  runFreshness,
  runHeaderSubline,
  runHeaderTitle,
  runSourceBadge,
} from "@/lib/runDisplay";
import type { RunsPayload, RunSummary } from "@/lib/types";
import { bodyMuted } from "@/lib/typography";
import { cn } from "@/lib/utils";

async function loadRuns(): Promise<RunsPayload | null> {
  try {
    return await getRuns();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

interface RunHeaderProps {
  /** Run stem from the page's ?run= param; null/undefined = latest run. */
  stem?: string | null;
}

/** Run identity, assumptions, and actions — shared across every data page. */
export async function RunHeader({ stem }: RunHeaderProps) {
  const runs = await loadRuns();

  if (!runs) {
    return (
      <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          No run data yet. Run the pipeline to populate{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            data/output/api/
          </code>
          .
        </p>
      </header>
    );
  }

  const currentStem = stem ?? runs.latest.stem;
  const run: RunSummary | undefined = runs.runs.find(
    (r) => r.stem === currentStem,
  );

  if (!run) {
    const fallback = runs.runs.find((r) => r.stem === runs.latest.stem) ?? runs.runs[0];
    return (
      <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Unknown run. Pick one that exists.
          </p>
          {fallback ? (
            <RunHeaderActions
              initialRuns={runs}
              currentRun={fallback}
              currentStem={runs.latest.stem}
            />
          ) : (
            <RunSwitcher
              runs={runs.runs}
              currentStem={runs.latest.stem}
              latestStem={runs.latest.stem}
            />
          )}
        </div>
      </header>
    );
  }

  const badge = runSourceBadge(run);
  const freshness = runFreshness(run);
  const isSample = badge.tone === "sample";
  const ContextIcon = isSample ? TriangleAlert : Info;

  return (
    <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-5 sm:px-6">
      {/* Top row: dominant source signal (left), actions (right, stacks on mobile) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <RunSourceBadge tone={badge.tone} label={badge.label} />
        <RunHeaderActions
          initialRuns={runs}
          currentRun={run}
          currentStem={currentStem}
        />
      </div>

      {/* Identity: what this run is, in plain terms */}
      <div className="mt-4 min-w-0">
        <p className="text-xl font-semibold tracking-tight text-balance text-foreground">
          {runHeaderTitle(run)}
        </p>
        <p className={`${bodyMuted} mt-1`}>{runHeaderSubline(run)}</p>
      </div>

      {/* Context / caveat, tied to the source badge above */}
      <div
        className={cn(
          "mt-3 flex max-w-prose items-start gap-2 text-xs leading-5",
          isSample ? "text-tag-gold-text" : "text-muted-foreground",
        )}
      >
        <ContextIcon className="mt-px size-3.5 shrink-0" aria-hidden />
        <p>{badge.description}</p>
      </div>

      {/* Quiet model details — weights, config, freshness behind a disclosure */}
      <details className="group mt-4 border-t border-border/50 pt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          Model details
          <ChevronDown
            className="size-3.5 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground/80">Weights</span>{" "}
            <span className="tabular-nums">{formatWeightsLabeled(run.weights)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-5">
            <RunFreshness freshness={freshness} />
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="tabular-nums">{runConfigLabel(run)}</span>
          </div>
        </div>
      </details>
    </header>
  );
}

/** @deprecated Use RunHeader — kept for incremental migration. */
export const RunContextBar = RunHeader;
